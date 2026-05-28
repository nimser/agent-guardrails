# Future Secret Pack Backlog

Unspec'ed Rule Packs for `@agent-guardrails/secrets`.
Pick these up as post-MVP changes. Reference `change-2-secret-blocking` and `change-5-command-transforms` for the spec pattern.

---

## AWS SSM / Secrets Manager

- `aws ssm get-parameter --with-decryption --name /prod/db-password`
- `aws secretsmanager get-secret-value --secret-id prod/db`
- Very common in AWS shops, straightforward patterns
- Watch for `--query` flag usage (agent may extract just the value)
- Consider: does `aws ssm get-parameters-by-path` need blocking? (bulk retrieval)

## Terraform

- `terraform output db_password`
- `terraform output -json` (dumps all outputs, including sensitive)
- `terraform state show module.db` (can contain secrets in state)
- Common in infra repos; sensitive outputs are marked but still readable
- Tricky: `terraform plan` and `terraform apply` output can leak secrets too — may need after-tool redaction rather than before-tool block

## HashiCorp Vault

- `vault kv get secret/database`
- `vault kv get -format=json secret/data/myapp`
- `vault read secret/data/myapp`
- Enterprise-focused, widely used in larger orgs
- Note: `vault token lookup` and `vault auth` are non-sensitive, allow through

## Database CLIs

- `psql -c "SELECT * FROM users LIMIT 10"` (could dump credentials table)
- `mysql -e "SHOW VARIABLES LIKE '%password%'"` (leaks server config)
- `mongosh --eval "db.users.find()"` 
- Hard to match reliably — most DB queries are legitimate
- Probably needs after-tool redaction (detect secret-shaped output) rather than before-tool block
- Consider scoping to known sensitive tables/columns via config

## Azure CLI

- `az keyvault secret show --name db-password --vault-name myvault`
- `az account get-access-token` (retrieves auth tokens)
- Mirror of AWS patterns for Azure shops
- Less common in coding agent workflows

## GCP CLI

- `gcloud secrets versions access latest --secret=db-password`
- `gcloud auth print-access-token`
- Mirror of AWS patterns for GCP shops
- Least common of the three cloud CLIs in coding agent contexts

---

## Priority Guidance

When picking these up, prioritize by:
1. **Likelihood of agent encountering it** — Terraform and AWS SSM top the list
2. **Pattern clarity** — can you match without excessive false positives?
3. **Block vs suggest feasibility** — is there a meaningful safer alternative?
4. **User demand** — check issues/discussions for requests
