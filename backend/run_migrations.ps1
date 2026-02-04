# PowerShell script to run database migrations
# Run this with: .\run_migrations.ps1

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Running Database Migrations" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Database connection details
$env:PGPASSWORD = "your_password_here"  # Replace with your PostgreSQL password
$dbName = "tour_saas"
$dbUser = "postgres"
$dbHost = "localhost"

Write-Host "Connecting to database: $dbName" -ForegroundColor Yellow
Write-Host ""

# Run the migration
Write-Host "Executing migration script..." -ForegroundColor Green
psql -U $dbUser -d $dbName -h $dbHost -f "migrations/complete_migration.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==================================" -ForegroundColor Green
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test packages added:" -ForegroundColor Cyan
    Write-Host "  - Tokyo Adventure 7 Days" -ForegroundColor White
    Write-Host "  - Paris Romantic Getaway" -ForegroundColor White
    Write-Host "  - Bali Beach Paradise" -ForegroundColor White
    Write-Host "  - New York City Explorer" -ForegroundColor White
    Write-Host "  - London Historical Tour" -ForegroundColor White
    Write-Host "  - Dubai Luxury Experience" -ForegroundColor White
    Write-Host ""
    Write-Host "You can now test the package search!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Migration failed! Check the error messages above." -ForegroundColor Red
}

# Clear password from environment
Remove-Item Env:\PGPASSWORD
