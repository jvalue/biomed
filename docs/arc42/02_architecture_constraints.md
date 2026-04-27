# 2. Architecture Constraints

Architecture constraints are any requirements that restrict software architects in their freedom of design and
implementation decisions or their freedom in decisions about the development process. (Starke & Hruschka)

## Technical Constraints

### R1: Technology Stack

In the JValue project, the following technology stack has been used so far:

**Backend:**

- Programming Language: TypeScript [^1]
- Framework: NestJS [^2] (based on NodeJS [^3])
- ORM: TypeORM [^4]
- Database: PostgreSQL [^5]

**Frontend:**

- Programming Language: TypeScript
- Framework: React [^6]
- Design Library: shadcn [^7]

The mentioned technologies and frameworks have proven themselves in the project so far. In addition, the development
team, which will continue to develop the application after the completion of this work, already has comprehensive skills
in these technologies and frameworks, which is why their use is desirable. Therefore, deviations from the technology
stack described here should only be made for compelling reasons.

### R2: Repository and Project Structure

The entire application must be managed in a GitHub monorepository. In the previous project, an NX monorepo was used for
this, which should therefore also be used for this system.

### R3: Parallel Development of Crawlers

The development of the crawlers takes place parallel to the development of this application, which is why the interfaces
between the management system and crawlers must be defined early on.

### R4: Runtime Environment

A Kubernetes cluster is available for the operation of the application, which is only accessible from the university
network of the Friedrich-Alexander-Universität.
This results in the following constraints:

- The application must be operated in a containerized manner.
- The deployment and configuration logic must be compatible with Kubernetes.
- Deployment through CI/CD pipelines must be carried out via a self-hosted runner running in the university network, as
  otherwise, there is no access to the cluster.

### R5: CI/CD

GitHub Action Workflows must be used for Continuous Integration and Continuous Deployment, as a corresponding quota and
a self-hosted runner for deployment into the infrastructure in the university network are available for this purpose.

---

[^1]: https://www.typescriptlang.org

[^2]: https://nestjs.com

[^3]: https://nodejs.org/en

[^4]: https://typeorm.io

[^5]: https://www.postgresql.org

[^6]: https://react.dev/

[^7]: https://ui.shadcn.com/
