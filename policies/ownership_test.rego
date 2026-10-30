package twgt.ownership

test_allow_owner if {
    allow with input as {
        "kind": "ownership",
        "from": {"id": "team-platform"},
        "to": {"id": "repo-TWGT-"},
        "attributes": {"role": "owner"}
    }
}

test_deny_non_owner if {
    not allow with input as {
        "kind": "ownership",
        "from": {"id": "team-platform"},
        "to": {"id": "repo-TWGT-"},
        "attributes": {"role": "viewer"}
    }
}

test_deny_malformed if {
    not allow with input as {
        "kind": "ownership",
        "from": {"id": "team-platform"}
    }
}
