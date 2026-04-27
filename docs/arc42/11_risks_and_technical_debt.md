# 11. Risks and Technical Debt

Since this architecture documentation does not refer to the current state of the implementation but describes a planned
target architecture, no technical debt can be named here. This will be presented in Chapter 7 (Evaluation), which
analyzes the actual implementation.

Therefore, only risks that exist in the currently planned generic architecture are considered below. Risks arising from
the use of a specific orchestrator are also discussed in Chapter 7 (Evaluation).

## 11.1 Permission Management Limited to Resource Types

As already described, permission management takes place on the basis of actions and resource types. For example, it can
be defined that a user is allowed to create schedules but not delete them. However, these permissions apply globally to
all resources of this resource type.

A more fine-grained subdivision, for example based on organizational units, is not provided for in the current
architecture.

While this reduces the complexity of the authorization logic, scenarios with multiple independent teams cannot be
ideally implemented due to the lack of subdivision into organizational units. This would require the use of a separate
instance per team or good coordination mechanisms between the teams.

## 11.2 Verifiability of Target URLs Without Authentication

In the current architecture, verifying the accessibility of target URLs is performed without the possibility of
authentication.

If a target server is only accessible with prior authentication, it can only be marked as having restricted
accessibility in the current architecture.

However, integrating all kinds of authentication methods would lead to a considerable increase in development effort.
This is disproportionate to the benefit of this function, as it only represents an aid and is not of critical importance
to the core functions of the application.
