package twgt.ownership

# Fail-closed by default
default allow := false

# Guard: Ensure the input actually contains the required fields
is_well_formed if {
    input.kind == "ownership"
    input.from.id
    input.to.id
    input.attributes.role
}

# Rule: Only "owner" role is permitted
allow if {
    is_well_formed
    input.attributes.role == "owner"
}

deny_reason := "Role must be 'owner' for ownership relationships" if {
    is_well_formed
    not allow
}
