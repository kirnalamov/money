# Comprehensive API Testing Script for Money App Backend

Write-Host "`n===== Money App Backend API Tests =====`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "Test 1: Health Check Endpoint" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
    Write-Host "✓ Health check passed" -ForegroundColor Green
    Write-Host "  Status: $($health.status)" -ForegroundColor Gray
    Write-Host "  Database: $($health.database)" -ForegroundColor Gray
    Write-Host "  Version: $($health.version)`n" -ForegroundColor Gray
} catch {
    Write-Host "✗ Health check failed: $_`n" -ForegroundColor Red
    exit 1
}

# Test 2: User Registration
Write-Host "Test 2: User Registration" -ForegroundColor Yellow
try {
    $registerBody = @{
        email = "testuser@example.com"
        username = "testuser"
        password = "TestPass123"
        full_name = "Test User"
    } | ConvertTo-Json
    
    $user = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/register" -Method Post -ContentType "application/json" -Body $registerBody
    Write-Host "✓ User registration successful" -ForegroundColor Green
    Write-Host "  User ID: $($user.id)" -ForegroundColor Gray
    Write-Host "  Email: $($user.email)" -ForegroundColor Gray
    Write-Host "  Username: $($user.username)`n" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "ℹ User already exists (expected if running multiple times)`n" -ForegroundColor Cyan
    } else {
        Write-Host "✗ User registration failed: $_`n" -ForegroundColor Red
        exit 1
    }
}

# Test 3: User Login
Write-Host "Test 3: User Login" -ForegroundColor Yellow
try {
    $loginBody = "username=testuser&password=TestPass123"
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method Post -ContentType "application/x-www-form-urlencoded" -Body $loginBody
    $accessToken = $loginResponse.access_token
    $refreshToken = $loginResponse.refresh_token
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "  Token type: $($loginResponse.token_type)" -ForegroundColor Gray
    Write-Host "  Access token received: $(if($accessToken) {'Yes'} else {'No'})" -ForegroundColor Graph
    Write-Host "  Refresh token received: $(if($refreshToken) {'Yes'} else {'No'})`n" -ForegroundColor Gray
} catch {
    Write-Host "✗ Login failed: $_`n" -ForegroundColor Red
    exit 1
}

# Test 4: Get Current User Profile
Write-Host "Test 4: Get Current User Profile (/me)" -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $accessToken"
    }
    $currentUser = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/users/me" -Method Get -Headers $headers
    Write-Host "✓ Get current user successful" -ForegroundColor Green
    Write-Host "  User: $($currentUser.username)" -ForegroundColor Gray
    Write-Host "  Email: $($currentUser.email)" -ForegroundColor Gray
    Write-Host "  Role: $($currentUser.role)`n" -ForegroundColor Gray
} catch {
    Write-Host "✗ Get current user failed: $_`n" -ForegroundColor Red
    exit 1
}

# Test 5: Update Profile
Write-Host "Test 5: Update User Profile" -ForegroundColor Yellow
try {
    $updateBody = @{
        full_name = "Test User Updated"
    } | ConvertTo-Json
    
    $updatedUser = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/users/me" -Method Put -Headers $headers -ContentType "application/json" -Body $updateBody
    Write-Host "✓ Profile update successful" -ForegroundColor Green
    Write-Host "  Full name: $($updatedUser.full_name)`n" -ForegroundColor Gray
} catch {
    Write-Host "✗ Profile update failed: $_`n" -ForegroundColor Red
    exit 1
}

# Test 6: Refresh Token
Write-Host "Test 6: Token Refresh" -ForegroundColor Yellow
try {
    $refreshBody = @{
        refresh_token = $refreshToken
    } | ConvertTo-Json
    
    $refreshResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/refresh" -Method Post -ContentType "application/json" -Body $refreshBody
    $newAccessToken = $refreshResponse.access_token
    $newRefreshToken = $refreshResponse.refresh_token
    Write-Host "✓ Token refresh successful" -ForegroundColor Green
    Write-Host "  New access token received: $(if($newAccessToken) {'Yes'} else {'No'})" -ForegroundColor Gray
    Write-Host "  New refresh token received: $(if($newRefreshToken) {'Yes'} else {'No'})`n" -ForegroundColor Gray
} catch {
    Write-Host "✗ Token refresh failed: $_`n" -ForegroundColor Red
    exit 1
}

# Test 7: Logout
Write-Host "Test 7: User Logout" -ForegroundColor Yellow
try {
    $logoutBody = @{
        refresh_token = $newRefreshToken
    } | ConvertTo-Json
    
    $logoutHeaders = @{
        Authorization = "Bearer $newAccessToken"
    }
    
    Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/logout" -Method Post -Headers $logoutHeaders -ContentType "application/json" -Body $logoutBody
    Write-Host "✓ Logout successful`n" -ForegroundColor Green
} catch {
    Write-Host "✗ Logout failed: $_`n" -ForegroundColor Red
    exit 1
}

# Test 8: Metrics Endpoint
Write-Host "Test 8: Prometheus Metrics" -ForegroundColor Yellow
try {
    $metrics = Invoke-RestMethod -Uri "http://localhost:8000/metrics" -Method Get
    if ($metrics -match "http_request") {
        Write-Host "✓ Metrics endpoint working" -ForegroundColor Green
        Write-Host "  Metrics data available`n" -ForegroundColor Gray
    } else {
        Write-Host "⚠ Metrics endpoint accessible but incomplete data`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Metrics endpoint failed: $_`n" -ForegroundColor Red
}

Write-Host "===== All Tests Completed Successfully! =====`n" -ForegroundColor Cyan
