# Issue Tracker: GitHub

Issues and PRDs for this repo live in GitHub Issues on `AlphaMao1/deepreader`.

Use the `gh` CLI from this repository when creating or updating issues.

## Commands

- Create issue: `gh issue create --title "<title>" --body-file "<path>" --label "ready-for-agent"`
- List issues: `gh issue list --state open --json number,title,labels,url`
- View issue: `gh issue view <number> --comments`
- Apply label: `gh issue edit <number> --add-label "<label>"`

## Rules

- PRDs can be represented as parent GitHub issues.
- Implementation work should be split into vertical-slice issues.
- Keep each issue independently verifiable.
- Avoid GitHub-only assumptions in prose when the same card is also useful as a local task description.
