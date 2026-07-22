# Example: Register DeepReader Nightly Health Check as a Windows Scheduled Task
# Run this script AS ADMIN to register the task.
# DO NOT run this directly unless you want to create a scheduled task.

$taskName = "DeepReader-Nightly-Health"
$scriptPath = "D:\Project\deepreader\qoder-nightly-health\run-nightly-health.ps1"
$runTime = "22:10"

# Create a daily trigger at 22:10
$trigger = New-ScheduledTaskTrigger -Daily -At $runTime

# Action: run the health check script
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File "$scriptPath""

# Settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register the task
Register-ScheduledTask -TaskName $taskName -Trigger $trigger -Action $action -Settings $settings -Description "DeepReader nightly repo health check"

Write-Host "Scheduled task '$taskName' registered successfully."
Write-Host "It will run daily at $runTime."
Write-Host ""
Write-Host "To unregister:"
Write-Host "  Unregister-ScheduledTask -TaskName '$taskName' -Confirm:$false"
