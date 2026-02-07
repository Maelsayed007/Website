$filePath = 'C:\Users\amend\.gemini\antigravity\scratch\gas-scripts\index.html'
$content = Get-Content $filePath
# We want to delete specific line ranges (1-indexed)

$linesToKeep = @()
for ($i = 1; $i -le $content.Length; $i++) {
    $skip = $false
    # Condition to skip lines
    if ($i -ge 4223 -and $i -le 4902) { $skip = $true } # Translations
    
    if (-not $skip) {
        $linesToKeep += $content[$i - 1]
    }
}

$linesToKeep | Set-Content $filePath
