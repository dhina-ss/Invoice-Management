import psycopg2
from psycopg2.extras import RealDictCursor
import sys
import os
import json

# Connection parameters
DB_NAME = "invoice_db"
DB_USER = "postgres"
DB_PASSWORD = "1234"
DB_HOST = "localhost"
DB_PORT = "5432"

def get_raw_connection(dbname=None):
    return psycopg2.connect(
        dbname=dbname or DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )

def init_db():
    # 1. Connect to default 'postgres' database to check/create 'invoice_db' database
    try:
        conn = get_raw_connection("postgres")
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}'")
        exists = cur.fetchone()
        if not exists:
            cur.execute(f"CREATE DATABASE {DB_NAME}")
            print(f"PostgreSQL database '{DB_NAME}' created.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error checking/creating database '{DB_NAME}': {e}", file=sys.stderr)

    # 2. Connect to 'invoice_db' and create tables
    try:
        conn = get_raw_connection()
        cur = conn.cursor()
        
        # Bills table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS bills (
                id SERIAL PRIMARY KEY,
                company VARCHAR(50) NOT NULL,
                bill_date VARCHAR(20),
                from_date VARCHAR(20),
                to_date VARCHAR(20),
                invoice_number VARCHAR(30),
                status VARCHAR(20) DEFAULT 'Pending',
                data_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Settings table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR(100) UNIQUE NOT NULL,
                value_json TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Invoice Counters table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS invoice_counters (
                id SERIAL PRIMARY KEY,
                company VARCHAR(50) UNIQUE NOT NULL,
                counter INTEGER DEFAULT 0 NOT NULL
            )
        """)

        # Seed default starting counters if empty
        cur.execute("SELECT COUNT(*) FROM invoice_counters")
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO invoice_counters (company, counter) VALUES
                ('Tidy', 6),
                ('Elite', 33),
                ('All Care', 140)
            """)
            print("Seeded starting invoice counters.")
        
        # Place table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS place (
                id SERIAL PRIMARY KEY,
                place_name VARCHAR(100) NOT NULL,
                company VARCHAR(50) NOT NULL,
                type_name VARCHAR(100),
                rate NUMERIC(10, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Check and alter place table to add type_name and rate if they don't exist
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='place' AND column_name='type_name'")
        if not cur.fetchone():
            cur.execute("ALTER TABLE place ADD COLUMN type_name VARCHAR(100)")
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='place' AND column_name='rate'")
        if not cur.fetchone():
            cur.execute("ALTER TABLE place ADD COLUMN rate NUMERIC(10, 2) DEFAULT 0")

        # Check and alter bills table to add status if it doesn't exist
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='bills' AND column_name='status'")
        if not cur.fetchone():
            cur.execute("ALTER TABLE bills ADD COLUMN status VARCHAR(20) DEFAULT 'Pending'")
        
        # Particulars table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS particulars (
                id SERIAL PRIMARY KEY,
                particular_name VARCHAR(100) NOT NULL,
                rate NUMERIC(10, 2) NOT NULL,
                company VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Seed default particulars if empty
        cur.execute("SELECT COUNT(*) FROM particulars")
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO particulars (particular_name, rate, company) VALUES
                ('TEA', 10.00, 'Elite'),
                ('COFFEE', 12.00, 'Elite')
            """)
            print("Seeded default particulars.")
        
        # Types table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS types (
                id SERIAL PRIMARY KEY,
                type_name VARCHAR(100) NOT NULL,
                company VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Seed default types if empty
        cur.execute("SELECT COUNT(*) FROM types")
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO types (type_name, company) VALUES
                ('Loaders', 'All Care'),
                ('House Keeping', 'All Care')
            """)
            print("Seeded default types.")

        # Users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                pin VARCHAR(20),
                email VARCHAR(150),
                phone VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        cur.close()
        conn.close()
        print("Database tables initialized successfully.")
    except Exception as e:
        print(f"Error initializing tables: {e}", file=sys.stderr)
        raise e

def execute_query(query, params=None, fetch=False, fetch_one=False, commit=True):
    """Executes a SQL query using connection and parameter values."""
    conn = get_raw_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(query, params or ())
        
        result = None
        if fetch:
            result = cur.fetchall()
        elif fetch_one:
            result = cur.fetchone()
            
        if commit:
            conn.commit()
            
        cur.close()
        return result
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def format_bill(row):
    """Helper to convert database RealDictRow to standard camelCase JSON response dict."""
    if not row:
        return None
    return {
        "id": row["id"],
        "company": row["company"],
        "billDate": row["bill_date"],
        "fromDate": row["from_date"],
        "toDate": row["to_date"],
        "invoiceNumber": row["invoice_number"],
        "status": row.get("status", "Pending"),
        "data": json.loads(row["data_json"]),
        "createdAt": row["created_at"].isoformat() if row["created_at"] else None,
        "updatedAt": row["updated_at"].isoformat() if row["updated_at"] else None,
    }
