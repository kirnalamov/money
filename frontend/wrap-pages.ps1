# PowerShell script to wrap all pages with ProtectedRoute

$pages = @(
    "accounts",
    "analytics",
    "portfolio",
    "profile",
    "savings",
    "settings",
    "transactions",
    "limits"
)

foreach ($page in $pages) {
    $filePath = "c:\money\frontend\app\$page\page.tsx"
    
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        
        # Check if already wrapped
        if ($content -match "ProtectedRoute") {
            Write-Host "$page already wrapped" -ForegroundColor Yellow
            continue
        }
        
        # Add import at the top (after other imports)
        if ($content -match "(`"use client`";[\r\n]+)") {
            $content = $content -replace "(`"use client`";[\r\n]+)", "`$1import ProtectedRoute from `"@/components/auth/protected-route`";`r`n"
        }
        
        # Find the return statement and wrap content
        $content = $ -replace "(return\s*\([\r\n]+\s*)(<\w+)", "`$1<ProtectedRoute>`r`n    `$2"
        $content = $content -replace "(\)\s*;\s*\}\s*)$", "  </ProtectedRoute>`r`n  );`r`n}`r`n"
        
        Set-Content -Path $filePath -Value $content
        Write-Host "$page wrapped successfully" -ForegroundColor Green
    }
}
