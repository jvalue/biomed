# 8. Cross-Cutting Concepts

## 8.1 Logging

Logging is a central cross-cutting concept of any application and essential to support stable operation as well as the
maintainability and traceability of the application, and is therefore explicitly formulated as a Priority A
requirement (A1.5). Especially in case of errors, comprehensive logging is indispensable to fully retrace and analyze
errors and problems that have occurred.

For the implementation of the following logging strategy, the logger integrated into NestJS is used, as it is natively
integrated into the used framework and additionally offers various log levels.

### Logging Strategy

The goal of the logging strategy is to provide sufficient information for operation and analysis without generating
excessive or large amounts of logs, which would impair traceability.
Because of this, logs are divided into different levels, precisely defining which events require which log level.
The log entries are divided into the log levels `debug`, `log`, `warn`, and `error` based on their urgency.

**Debug:**
Logs of the `debug` category are primarily used for development and analyzing problems in this phase. They contain
comprehensive technical information that is not required in productive operation. This includes among others:

- Generated objects and internal data structures
- Executed database operations
- Detailed information on internal processing steps

Logs of this category are generally not displayed in the productive log.

**Log:**
The log level `log` is used for regular and expected system events and therefore forms the majority of log entries. The
following guidelines apply here:

- Every incoming API request must be logged, including the called endpoint, request payload (without sensitive data),
  and ID of the requesting user.
- Every outgoing request to an external system must be logged, including the path of the endpoint to be called, request
  payload (without sensitive data), and response code.
- Start and end of automated processes (e.g., synchronization processes) must be logged.
- Write operations to the database must be logged, but without payload.
- Sensitive data such as passwords, API keys, or tokens must never be logged.

**Warn:**
Logs of the `warn` category describe anomalies that do not prevent the correct and complete processing of the request.
Examples include:

- Deviations from the expected flow without immediate error (e.g., previous synchronization process is not yet
  completed).
- Missing parameters that do not prevent the processing of the request (e.g., Crawler Template not referenced in a Run).

**Error:**
Logs of the `error` category describe errors that prevent the correct and complete processing of the request. These
include, for example:

- Failed database connection attempt
- Failed requests to external systems
- Unhandled exceptions

In particular, logs of the `warn` and `error` categories must contain extended information that facilitates the
traceability of errors, such as the object to be processed or parts of the current system state relevant to the problem.

## 8.2 Authentication and Authorization

Authentication and authorization are central security-relevant cross-cutting concepts of the application and ensure that
exclusively authorized persons or systems gain access to the application.
Furthermore, it must be verified that persons or systems only get access to the resources they are authorized for.
Since both persons and external systems have to interact with the management backend, different mechanisms are required
for this.

The authentication and authorization strategy presented below serves to fulfill requirements A2.1, A2.2, and C2.1.

### 8.2.1 Authentication and Authorization in the Backend

#### Authentication

Authentication describes the process of a system in which it is verified whether an identity (user or system) is who it
claims to be (Kosinski, Clark, & Scapicchio, 2026).
PassportJS [^1] is used for authentication, as this library offers various authentication strategies and is also
recommended by NestJS for authentication.
In the following, a distinction must now be made between the authentication of users and that of external systems, such
as the crawlers.

**Frontend Users:**
The frontend authenticates users via Hypertext Transfer Protocol (HTTP) only Bearer Tokens. These are issued in the
management backend and stored in the browser as HTTP-only cookies. This procedure is of enormous importance for
protection against cyberattacks, as JavaScript cannot read this type of cookies, thereby preventing Cross-Site
Scripting (XSS) attacks (MDN, 2025).
With each API request, the Bearer Token is sent along and subsequently validated by the PassportJS Bearer strategy.
After successful validation, the user context is added to the request and is available to the receiving components (see
Authentication and Authorization).

**External Systems (Crawlers):**
External systems authenticate themselves via API keys, as these are technical clients without interactive login. For
this purpose, each external system has a unique API key that is transmitted with every request and validated by the
PassportJS API key strategy. The API keys are stored encrypted in the database and have a description of the usage
context for documentation purposes.

#### Authorization

Authorization describes which resources a user can access or which actions they are allowed to perform (auth0, n.d.).
CASL [^2] is used for authorization and the associated fine-grained rights management. CASL enables the definition of
so-called Subjects and Actions, where a Subject describes a resource (e.g., Crawler Run) and Action describes an action
for a resource (e.g., Create). After authentication by PassportJS, the passed rights from the user context are
translated into so-called CASL Abilities, based on which rights checking takes place using CASL.
Since both rights checking and authentication usually take place directly in the controller, explicit decorators are
developed for authentication and rights checking, so that verification can easily take place using annotations at the
respective endpoint (see Authentication and Authorization).

### 8.2.2 Authentication and Authorization in the Frontend

Authentication and authorization also play a crucial role in the frontend to offer protection against unauthorized
access.
The overarching authentication takes place here in an authentication context, which retrieves the current user profile
from the backend upon initialization of the application. If this request is successful, the user information including
the user's rights is available to the frontend. However, if the request fails, no user is logged in, and only a static
welcome page is displayed.
Authorization in the frontend also takes place via CASL, which significantly increases maintainability.

In addition, an Auth Guard is created that checks whether a user is logged in and, if not, redirects to the login page.
Likewise, a Permission Guard is developed, which uses CASL to check whether the user has the required rights and, if
not, displays an error message. The two guards are used in the corresponding pages and thus centrally handle rights
checking, so that the actual component contains only the business logic.

## 8.3 Orchestrator Abstraction Layer

To fulfill requirement A1.4, so that a change of the orchestration framework does not require a complete redevelopment
of the management system, but merely the new development of a client suitable for the orchestrator, an abstraction layer
must be introduced.
As already described in chapter 4.3.5 Orchestrator Independence, this abstraction layer is located in the backend. The
naming of resources before this abstraction layer is defined as follows:

- **Crawler Run:** The unique execution of a crawler is described as a crawler run.
- **Crawler Template:** The unparameterized template of a crawler is referred to as a crawler template, which can be
  executed through parameterization and thus creates a crawler run with each execution.
- **Schedule:** A schedule describes the time-controlled regular execution of a crawler template with parameterization.

Looking at the orchestrator-dependent responsibilities, the following tasks emerge:

- Communication with the orchestrator
- Conversion of crawler templates created in the frontend into the orchestrator's format
- Conversion of schedules created in the frontend into the orchestrator's format

According to the Single Responsibility Principle from the SOLID principles, a component should have only one
responsibility (Martin, 2003, p. 95), which results in three individual components for the three responsibilities. To
ensure independence between business logic and concrete implementation of the orchestrator-dependent logic, three
interfaces are defined for this purpose, which define the interfaces to be implemented by the orchestrator-specific
components.

The first interface is the Orchestrator Client Interface and defines the interfaces for communication with the
orchestrator.
The second interface is the Template Engine Interface, which offers the interface for creating crawler templates in the
orchestrator. In the case of Argo Workflows, a YAML document must be built from the parameters, for example.
In addition, there is the third interface, the Schedule Engine Interface, which defines the interface for creating
schedules. In the case of Argo Workflows, a YAML document must again be built here.

## 8.4 Disaster Recovery

A good concept for disaster recovery is indispensable to ensure reliability and availability. The goal here is to return
the application to a consistent state after crashes without data loss and thereby fulfill requirement A1.2.

A large part of the system state, such as crawler templates, schedules, and crawler runs, is managed by the orchestrator
and thus also persisted by it. In the case of Argo Workflows, this data is stored in the etcd of the Kubernetes cluster
and in Argo's own database. Possible data loss due to a crash of the entire Kubernetes cluster is prevented by backing
up the cluster's etcd.
The application's own system state, such as user data and API keys, is stored in a separate PostgreSQL database and is
thereby protected against data loss in the event of failures.

The operation of the application, as well as the associated databases and also Argo Workflows, takes place completely
containerized in the Kubernetes cluster and is deployed via Helm Charts. Failed pods are automatically restarted without
manual intervention being necessary. The data of the database is stored in a persistent volume, so that it is secured
even beyond a crash.
The combination of persistence implemented by Argo Workflows in the cluster's etcd and persistent storage of backend
data in a separate database, as well as Kubernetes' automatic restart mechanisms, ensures that the application
automatically restarts in a consistent state without data loss after a crash.

## 8.5 Generic Alerting

To offer alerts and thereby fulfill requirements C1.4, C3.5, C4.4, an alerting concept is needed. This should enable
easy addition of further alerting channels as well as alerting events.
Furthermore, any users should be able to be added, who then have the choice for which alerts they want to be notified.

### 8.5.1 Decoupling of Alerting Sources and Alerting Recipients

The Publisher-Subscriber pattern is suitable for the decoupling of alerting sources and alerting recipients.
This architectural pattern is particularly suitable for systems with events without creating a tight coupling between
event generators (publishers) and event recipients (subscribers) (Azure, 2026).
Publishers generate events without knowing which components consume them. Subscribers subscribe to specific types of
events without knowing the publishers. A generic message broker, which receives an event from the publishers and passes
it on to the subscribing subscribers based on the event type, ensures decoupling.

In this system, the Notification Event Manager represents the message broker and is therefore the central component of
the pattern. It also manages the subscribers, in this case the users, including the event types they have subscribed to,
as well as the desired alerting channels.
Several components in the system act as publishers, currently the Crawler Run Metrics Module, the Orchestrator Sync
Module, and the Alarmation Watcher Module, whereby further publishers can be added at any time. The publishers generate
structured alarm events and pass them to the Notification Event Manager without knowledge of the alerting recipients.
When an event arrives, the Notification Event Manager determines the desired recipients via the database and forwards
the alert via the specified channel (e.g., via the Mailing Client).

An advantage of using this design pattern is in particular the low coupling between publisher and subscriber, so that
changes to the alerting logic do not affect the notification logic and vice versa. Another advantage is the high
extensibility for new alerting sources and notification channels.
A disadvantage, however, is the increased development effort with a low number of publishers and notification channels.
The advantages of using the design pattern, however, far outweigh this disadvantage.

### 8.5.2 Extensibility of Alerting Sources

The Strategy Pattern is used for flexible extensibility of the alerting sources. This design pattern is particularly
suitable for problems where different implementations are to be used at runtime without coupling the calling component
to a specific implementation. A strategy encapsulates an algorithm or a behavior and allows it to be varied
independently of the clients using it (Gamma, Helm, Johnson, & Vlissides, 1993, p. 17).

In this context, the Strategy Pattern is used to perform various types of checks, such as queue overload or storage
utilization, while being flexibly extensible for further checks.
The Alarmation Watcher acts as the central component for the alerting checks. All alerting strategies are registered in
the Alarmation Watcher. The Alarmation Watcher then periodically executes them and forwards detected warning events to
the Notification Event Manager. The Alarmation Watcher exclusively knows the interface of the strategies (Alarmation
Strategy Interface) and is therefore decoupled from the concrete implementation of the strategies.

The Alarmation Strategy Interface defines the interface that contains the calling logic and must be implemented by every
alerting strategy.
Advantages of using the Strategy Pattern in this context are the easy extensibility with alerting strategies and the low
coupling to the Alarmation Watcher, which is strictly bound to the interface. Likewise, the Single Responsibility
Principle is maintained by giving each strategy its own responsibility and letting the Alarmation Watcher handle the
timing control.
Disadvantages of the Strategy Pattern in this context are the increased implementation effort due to the interface and
the defined calling structure, where the advantages are clearly superior to these disadvantages.

### 8.5.3 Example: Extension with an Additional Alerting Check

To illustrate the high extensibility of the described system, the effort that would arise from adding another alerting
check is shown below.
On the one hand, an Alarmation Strategy is required that implements the Alarmation Strategy Interface and implements the
checking logic. On the other hand, the strategy must be registered in the Alarmation Watcher, for example via Dependency
Injection, although depending on the concrete implementation, this can also happen automatically. Subsequently, a new
event type must be added that users can subscribe to. Without using the mentioned patterns, the alerting logic would be
implemented centrally and extensions would require modifications to the existing logic, which violates the Open-Closed
Principle (Meyer, 1997) and leads to an increased risk of errors during maintenance.
Through the use of the patterns, in turn, extensions to the logic are independent of previous checks, and a clear
separation of responsibilities is given.

### 8.5.4 Extensibility of Alerting Channels

The alerting channels should also be easily extensible. At present, alerting via e-mail is merely intended for this.
However, to stay open for extensions according to the Open-Closed Principle, the Strategy Pattern is also applied here.
A Notification Client Strategy Interface is defined, which all clients for alerting channels must implement. All
strategies for the offered alerting channels are registered with the Notification Event Manager, which then applies the
desired alerting strategy according to the user's selection in an alerting case.

## 8.6 Consistent Handling of API Requests in the Frontend

Communication with the management backend is a significant cross-cutting concept as it affects almost all frontend
functions.
The goal of the cross-cutting concept for API requests in the frontend is to create a basis that already offers simple
basic mechanisms for consistent data storage, error handling, retry mechanisms, and caching. As a foundation for this,
TanStack Query [^3] is used in conjunction with Axios [^4].
TanStack Query strongly abstracts the use of HTTP requests executed by Axios and allows developers to focus on
professional logic. Thus, TanStack Query orchestrates the loading of data, automatic refetching, error states, cache
management, and retry mechanisms completely autonomously.

### 8.6.1 Caching in the Frontend

Caching plays a central role with regard to latency when interacting with the backend. It helps to reduce network
requests to the backend and thereby decrease both the network load and the load on the backend. Caching also brings the
risk of inconsistency regarding data, which is why a special concept is necessary. A client-side cache is built by
applying TanStack Query.
The caching strategy is based on three concepts: The identification of resources via Query Keys, the update strategy
using polling, and invalidation upon write access.

Every API request is identified uniquely by a key, the Query Key, and stored in the cache. Such a key is hierarchically
structured as an array (e.g., `["schedule", namespace, name]`). This enables not only the caching of specific resources
but also the addressing of entire resource groups. More complex queries, such as the querying of lists with filter
parameters (e.g., Crawler Runs), include the filter parameters in the Query Key to ensure that different
parameterizations of the query are cached separately and do not access the same cache.

When displaying Crawler Runs and also other resources, the timeliness of the data is of tremendous importance. The data
must therefore be continuously updated.
For this, a distinction must be made between static polling and dynamic polling. Static polling signifies the update and
the associated repeated API request in periodically defined time intervals. This kind of polling is useful for schedules
or crawler templates, for example, which change less frequently.
With resources such as metrics for crawler runs, which constantly change during their execution, a higher polling
frequency must be chosen. If a run has already finished, however, its metrics no longer change and a high polling
frequency would lead to unnecessary API requests. The polling frequency is thus determined dynamically in such cases, in
this instance based on the phase of the run.

Another case where a resource's data becomes invalid occurs when a resource is altered. If a schedule is deleted, for
example, the currently cached list of schedules is no longer correct. To solve this problem, the Invalidation Pattern is
used. If a resource is altered (mutation), its Query Key is invalidated and with it the cache entry. This triggers
re-fetching of data to reach a consistent state again. However, this methodology only works if the resource was altered
on the same client.
In summary, the described caching strategy achieves a compromise between the timeliness of data and network load. The
polling strategy and fine-grained control of caching via Query Keys minimizes the risk of obsolete data, while dynamic
polling offers the most near real-time experience possible without overloading the server with unnecessary requests.

### 8.6.2 Error Handling and Retry Strategy

The error handling of API requests should also be defined as a cross-cutting concept to achieve behavior as similar as
possible in various components. Thus, retries should not be performed uncontrollably but explicitly controlled by a
refetch logic. For this purpose, a distinction is drawn between retry-qualified and retry-unqualified error types.
Retry-unqualified error types are all those whose HTTP response code lies between 400 and 500, as these are client
errors and would thus most likely re-occur with the next request. All other errors are qualified for retry, and affected
requests are therefore repeated after a reasonable waiting period.

## 8.7 Error Handling in the Frontend

To attain robust error handling with meaningful error messages in the frontend, an explicit strategy is required.
Error handling is operated hierarchically across different levels.
On the highest overarching level, a global error component (Error Boundary) is defined, treating all errors not caught
on lower levels. Such an error is logged as well as displayed to the user as a prompt containing the respective error
text.
Errors occurring during communication with the backend via API requests are handled by a central HTTP client. Upon such
an error occurring, based on the error source, the error is logged and displayed to the user containing a corresponding
error message.

Besides technical errors, such as a drop in connection, professional errors can also occur. Only the professional
component alone knows how to deal with these errors, which takes on the error handling in these cases. Entering an
incorrect password when logging in serves as an example for this.
By clearly separating errors into distinct hierarchies and responsibilities, the application offers extensive error
handling and thus secures stable error communication understandable for the user.

## 8.8 Folder Structure in the Repository

A cross-cutting concept that exerts arguably less influence on the application proper but carries tremendous importance
for developmental work nonetheless is the folder structure within the repository. Without a defined folder concept, the
maintainability of a project declines sharply.
Frontend and backend are thereby situated in two separate folders, which are described independently hereinafter.

### 8.8.1 Frontend

At the highest level in the source file folder, there are five subfolders, with the `api` folder containing all relevant
components for communicating with the backend. It is further primarily divided into `dto` capturing all objects coming
from the backend, `hooks` for all hooks, and `services` carrying components providing methods translated into API
requests querying the backend.

The `components` folder houses all graphical components, partitioned by domain. A special characteristic here is the
`design-components` directory, storing solely unfunctional design elements, most derived from the user-interface frame
shadcn. The `guards` folder under components holds the earlier-detailed guards for user rights verification.

Overarching components, such as the Auth Context or respectively the Error Boundary are located in the `contexts`
folder.
The files necessary for routing are to be found inside the `routes` directory (see Routing in the Frontend).
Within the `utils` directory lie general non-graphical bits providing reusable logic.

### 8.8.2 Backend

In the backend, the structuring by domains transpires explicitly top-level already. Concurrently, particular
administrative technical folders are manifested here.
The responsibilities bound to the individual modules have previously been reviewed within the Building Block View
section, bypassing added elaborations on the topic there.
The individual folders in turn are furthermore structured as follows:
On the one hand, traditional standard structural pieces native to NestJS reside here, like the Controller providing the
API endpoints, the Service carrying the actual logic, the Module capturing the dependencies alongside exported elements,
as well as tests. On the other hand, supplementary subfolders intended for further sorting exist, such as `dto` (Data
Transfer Objects), `entity` detailing the database objects, along with `mapper` for alterations from an object to
another. Not all of these folder distributions are necessitated inside all modules, just as some folders enclose even
lengthier branches further in. This specific instance merely aims to highlight a coarse concept conveying the finer
structure of folders.

---

[^1]: https://www.passportjs.org

[^2]: https://casl.js.org/v6/en/

[^3]: https://tanstack.com/query/latest

[^4]: https://axios-http.com/docs/intro
