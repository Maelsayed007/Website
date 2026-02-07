$filePath = 'C:\Users\amend\.gemini\antigravity\scratch\gas-scripts\index.html'
$content = Get-Content $filePath
# We want to delete specific line ranges (1-indexed)

$linesToKeep = @()
for ($i = 1; $i -le $content.Length; $i++) {
    $skip = $false
    # Condition to skip lines
    if ($i -ge 5258 -and $i -le 5383) { $skip = $true }
    elseif ($i -ge 5566 -and $i -le 5717) { $skip = $true }
    elseif ($i -ge 5719 -and $i -le 5861) { $skip = $true }
    elseif ($i -ge 15712 -and $i -le 15784) { $skip = $true }
    
    if (-not $skip) {
        $linesToKeep += $content[$i - 1]
    }
}

$linesToKeep | Set-Content $filePath
