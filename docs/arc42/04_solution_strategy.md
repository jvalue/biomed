# 4. Solution Strategy

Solution strategies describe fundamental architectural decisions that have a significant impact on the structure and
overall architecture of the system. They are derived from essential requirements and constraints.

### Backend Technology Stack

For the implementation of the backend, the NestJS framework is used in conjunction with the TypeScript programming
language. This decision follows constraint R1, defined in the architecture constraints, to reuse the technology stack
used in the JValue project and thus minimize training effort.

A PostgreSQL database is used for data persistence. Database access is handled via the object-relational mapping
framework TypeORM, which enables a clear separation between business logic and database logic.

### Frontend Technology Stack

The React framework in combination with TypeScript is used in the Management Frontend. Shadcn is used as the design
library.

These technology decisions also result from constraint R1, aiming to minimize the training effort for the existing
development team.

### Repository Structure

The entire application is managed in an NX monorepo, following constraint R2.

### Deployment

The application is operated in a containerized manner and deployed to the existing Kubernetes cluster. Helm [^1] charts
are used to enable automatic deployment.

Due to constraints R4 and R5, deployment is carried out via a GitHub Actions workflow running on a self-hosted runner
within the university network.

### Orchestrator Independence

To fulfill requirement A1.4, which demands the ability to change the orchestration framework without completely
redeveloping the management system, an abstraction layer is needed.

An orchestrator abstraction layer is introduced in the backend for this purpose.
All orchestrator-dependent functionalities are addressed via a generic interface, which is implemented by a concrete
implementation depending on the chosen orchestration framework.
Since this abstraction layer is located in the backend, the frontend is completely independent of the used orchestration
framework.

### Independence of the System from Crawler Structure

The internal structure and composition of the crawlers are not influenced by the management system in order to fulfill
requirement A1.3.

For this purpose, the management system merely provides generic interfaces for recording metrics, events, and progress
information. Which components of the crawler address these interfaces is therefore irrelevant to the management system.

---

[^1]: https://helm.sh/en/
