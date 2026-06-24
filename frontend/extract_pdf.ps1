$pdfPath = "d:\Projects\Bill Generate\src\assets\AllCare invoice.pdf"
$bytes = [System.IO.File]::ReadAllBytes($pdfPath)
$raw = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($bytes)

# Extract text between BT and ET markers (PDF text objects)
$pattern = 'BT\s*([\s\S]*?)\s*ET'
$matches = [regex]::Matches($raw, $pattern)

Write-Host "Found $($matches.Count) text blocks"
Write-Host "========================================="

foreach ($m in $matches) {
    $block = $m.Groups[1].Value
    # Extract parenthesized text strings like (Hello World)
    $textPattern = '\(([^)]*)\)'
    $textMatches = [regex]::Matches($block, $textPattern)
    foreach ($t in $textMatches) {
        $val = $t.Groups[1].Value.Trim()
        if ($val.Length -gt 0) {
            Write-Host $val
        }
    }
}
