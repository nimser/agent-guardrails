name: Feature Request
description: Suggest a new rule pack, adapter, or engine feature
labels: [enhancement]
body:
  - type: markdown
    attributes:
      value: |
        Have an idea for a new rule pack, adapter, or engine improvement? Fill this out.

  - type: dropdown
    id: type
    attributes:
      label: What kind of feature?
      options:
        - New rule pack (YAML)
        - New adapter (harness integration)
        - Engine improvement (matcher, resolver, etc.)
        - Documentation
        - Other
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Describe the feature
      description: What problem does this solve? What commands, file paths, or tool calls should it handle?
    validations:
      required: true

  - type: textarea
    id: example
    attributes:
      label: Example
      description: Show what the rule pack, adapter, or API would look like.
      render: yaml
    validations:
      required: false

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
      description: Any workarounds or existing approaches that partially address this?
    validations:
      required: false
