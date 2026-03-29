# 9. Architecture Decisions

This chapter describes architecture decisions that were made before or during development. The decisions are described
in the format of Architecture Decision Records [^1], so that both the context and the resulting consequences of the
decisions can be presented in a structured manner.

## 9.1 Routing in the Frontend

**Context**
The management of routes in the frontend should be as simple as possible, without the need for a manually maintained
configuration file.

**Decision**
File-based routing is used for routing. TanStack Router [^2] was chosen for this purpose.

**Consequences**
File-based routing eliminates the need for a manually maintained configuration file. This results in a reduction of
boilerplate code.

## 9.2 Database Migrations

**Context**
In the agile development of the management backend, adjustments and extensions to the database structure will repeatedly
be necessary. On the one hand, these should not be performed manually using SQL scripts, and on the other hand, they
should not happen automatically by analyzing the code, as this leads to an increased risk of data loss.

**Decision**
TypeORM Migrations [^3] are used for adjustments and extensions to the database structure. For this purpose, after
making changes to the entities in the code, a migration command is executed in the command line, which generates a
migration file that is automatically executed on the database after manual review.

**Consequences**
On the one hand, the created migrations ensure a consistent state across all stages after deployment, and on the other
hand, the manual review process of the migration file prevents unwanted data loss without the manual effort of creating
an SQL script.

## 9.3 Custom Persistence of Schedules

**Context**
Errors regarding inconsistencies with referenced Crawler Templates should be displayed for Schedules. However, the check
for inconsistencies should not have to take place every time a schedule is called in the frontend, as this would lead to
unnecessary overhead. With many schedules and simultaneous calls, this could potentially bring a high load to the
orchestrator and the management backend.

**Decision**
When created via the management backend, schedules are persisted in our own database so that errors for the schedules
are stored there, and the check for inconsistencies can take place periodically. In addition, the application stores the
version of the crawler template at the last check and only performs a check if it has changed.

**Consequences**
While storing schedules in our own database creates an increased storage requirement, the overhead from dynamic checks
and associated load with each schedule call decreases enormously. By storing the last checked version of the referenced
crawler templates, the frequency of necessary checks is drastically further reduced.

## 9.4 Synchronization of Schedules with the Orchestrator

**Context**
Due to the decision to store schedules in our own database as well, it is now essential to ensure consistent data
storage regarding the schedules between the orchestrator and our own application. While schedules should actually be
created exclusively via the crawler management and thus stored in the database, it is theoretically still possible to
create schedules directly in Kubernetes via Custom Resource Definitions.

**Decision**
At regular intervals, the Orchestrator Sync component fetches all schedules known to the orchestrator and updates them
in our own database or adds unknown schedules if necessary.

**Consequences**
The synchronization creates additional effort, as it takes place regularly. However, since consistency between the
orchestrator and the management system must be provided, this additional effort is indispensable.

## 9.5 Generic Metrics

**Context**
The crawler management system should be as generic and completely independent of the crawlers' structure as possible,
but still be able to display crawler metrics (Requirements A5.1, A5.2).

**Decision**
For storing crawler metrics, an interface with predefined parameters is offered, as well as one with generic parameters.
The generic interface expects the parameters name, value, data type, description, and a timestamp of the metric to be
stored.

**Consequences**
Through the generic interface with predefined parameters, detailed and specific statistics can be displayed. Through the
purely generic interface, any number of other unknown metrics can still be stored and displayed to the user. For unknown
metrics, however, only simple statistics can be displayed, as the specific context is not known for them.

## 9.6 Visualization of the Crawler Structure

**Context**
For requirement C3.3, the structure of individual crawlers should be visualized. However, since this should be
independent of the crawler management system and the system therefore does not know the structure of the crawler, this
information cannot come from the crawler management system itself.

**Decision**
Each crawler must be representable as a Directed Acyclic Graph (DAG). Since only the crawler itself knows its structure,
an interface is offered through which it can communicate its structure to the system. This works by passing a list of
nodes with predecessors and successors. Since the crawler can also consist of several containers, the management backend
must be able to handle receiving this information from several parts of the crawler independently and then assembling it
accordingly.

**Consequences**
Through the generic interface for passing crawler structures, the lowest possible coupling between the crawler and the
backend is achieved, thereby also guaranteeing independence from the crawler structure. However, because the backend
relies on data from the crawler, visualization cannot be guaranteed and, moreover, can only be offered starting from the
first run of a crawler template.

## 9.7 Initial User

**Context**
As already described in the runtime view for the user workflow, users can register themselves and must then be confirmed
by a user with appropriate permissions. However, this creates the problem of how the very first user gets into the
system.

**Decision**
The username and password of an initial user are provided via environment variables, and this user is automatically
created with all permissions when the application starts, should there not already be a user in the system.

**Consequences**
The creation of the initial user ensures that there is at least one active user in the system at all times who can
confirm other users.

---

[^1]: https://adr.github.io

[^2]: https://tanstack.com/router/latest

[^3]: https://typeorm.io/docs/migrations/why
