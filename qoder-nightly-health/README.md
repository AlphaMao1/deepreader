# DeepReader Nightly Repo Health Check

Automated nightly health check workflow for the DeepReader repository.

## Structure

``
qoder-nightly-health/
  README.md
  run-nightly-health.ps1          # Main health check script
  register-windows-task.example.ps1 # Windows Task Scheduler example
  runs/
    YYYY-MM-DD/
      final-report.md             # Human-readable report
      raw/                        # Raw command output logs
``

## Usage

Run manually:

``powershell
powershell -NoProfile -ExecutionPolicy Bypass -File run-nightly-health.ps1
``

Register as nightly task (requires admin):

``powershell
# Review register-windows-task.example.ps1 first
# Then run it as administrator
``

## Notes

- The script does NOT modify source code
- The script does NOT commit, push, or create PRs
- Failed checks are recorded but do not stop other checks
- Reports are generated per-date under runs/
