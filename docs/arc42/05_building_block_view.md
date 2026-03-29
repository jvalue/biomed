# 5. Building Block View

The vast majority of the business logic is implemented in the backend. There are several reasons for this.

First, a lean frontend implementation significantly reduces the loading time of the website, as much less data needs to
be transferred. A study by Google shows that increasing loading times have a direct impact on bounce rates and user
experience (Google, 2017).
Second, this decision increases maintainability, as changes to the business logic mostly only need to be made in the
backend.
Third, this reduces security risks, as client-side code can be viewed and manipulated by the user and therefore offers
no trustworthy basis for relevant decisions, such as permission checks. According to OWASP, this represents the greatest
security risk for web applications in 2025 (The OWASP Foundation, 2025).
Fourth, the testability of the application improves, as the backend application can be tested in isolation.
Therefore, the frontend mainly contains only display logic, which is why the frontend is only discussed with respect to
specific components in the sections on cross-cutting concepts, architectural decisions, and the implementation chapter.

In the following, all building blocks of the management backend, as well as their interactions, are presented.
Subsequently, each building block is briefly described, and the requirements that primarily necessitate the respective
building block are stated.

![building_block_view.png](building_block_view.png)
*(Figure 2: Building Block View)*

### Auth Module

The Auth Module serves as the central entry point for all API requests to the management backend and handles user
authentication.
Moreover, it is responsible for permission checks, as well as login and registration. For this, it interacts with the
Users Module to obtain information about the users (Requirements A2.1, C2.1).

### Users Module

The Users Module manages all user data and stores it in the database. This includes, for example, creating new users and
adjusting permissions (Requirements A2.2, C2.1).

### Orchestrator Client Interface

The Orchestrator Client Interface defines the interface for interacting with the orchestration framework. All access to
the orchestrator takes place exclusively natively through this interface.
This ensures that when switching the orchestration framework, only a new implementation against the interface is
necessary, without having to change the business logic (Requirement A1.4, as well as all requirements that require
communication with the orchestrator).

### Crawler Runs Module

The Crawler Runs Module offers API endpoints to retrieve information about ongoing and completed runs. The data for this
comes from the Orchestrator Client. In addition, the module serves as an interface for crawlers to store metrics,
events, and progress information. The storage and evaluation of this information, however, take place in the Crawler Run
Metrics Module (Requirements A4.1, A4.2, A5.1, A5.2, B4.1, B4.2, B4.3, C4.1, C4.2, C4.3).

### Crawler Run Metrics Module

The Crawler Run Metrics Module is responsible for storing the metrics and events of runs in the database and provides
this information both in aggregated and run-specific forms. To obtain information about the resources used by a run, the
Kubernetes Client is addressed.
Depending on the urgency, events are forwarded to the Notification Event Manager (Requirements A5.1, A5.2, B4.1, B4.3,
C4.1, C4.2).

### Kubernetes Client

The Kubernetes Client provides information on the status of the cluster, such as the health status, or the current
utilization and resource consumption of individual runs' pods. Furthermore, it provides the priority classes available
for prioritizing runs (Requirements B1.1, B3.2, C1.1, C1.2, C1.4, C4.1).

### Crawler Templates Module

The Crawler Templates Module provides API endpoints for managing and displaying information about the crawler templates.
Here too, the information comes from the Orchestrator Client. In addition, an API endpoint for starting a run of a
template is offered. The creation of crawler templates is delegated to the implementation of the Template Engine
Interface (Requirements A3.2, A3.3, C3.4).

### Template Engine Interface

The Template Engine Interface provides an interface through which crawler templates can be assembled. The interface is
implemented by an orchestrator-specific template engine. Depending on the orchestrator, the templates are persisted
either via the orchestrator, which handles versioning in a Git repository, or directly via the GitHub Client (
Requirement C3.4).

### GitHub Client

The GitHub Client encapsulates communication with the GitHub API and offers interfaces for creating pull requests, for
example (Requirement C3.4).

### Schedules Module

The Schedules Module forms a central component of the system and manages all time-scheduled executions.
It offers functions for creating, modifying, and deleting schedules via API endpoints. Additionally, it provides
detailed information on the schedules and aggregated statistics on their runs, which the Crawler Run Metrics Module
provides.
The schedules are stored locally in the system's own database (see "Custom Persistence of Schedules") and also sent to
the orchestrator for storage via the Schedule Engine Interface.
It also provides an interface for synchronizing schedules created in the orchestrator, as well as an interface for
storing errors per schedule. Another area of responsibility of the Schedules Module is the detection of target and
storage parameters. If a schedule is created or changed and such a parameter is found, the Targets or Storages Module is
called for its management. A target parameter indicates from which URL the crawler should fetch the datasets. A storage
parameter defines where the datasets should be stored. When a schedule is deleted, the associated targets or storages
are removed via the respective module (Requirements A3.3, A3.4, A3.5, A5.2, B3.1, B3.2, B3.3, B3.4, C1.3, C3.2, C3.5).

### Schedule Engine Interface

The Schedule Engine Interface defines an interface for creating schedules, which is fulfilled by an
orchestrator-specific implementation. The created schedule is then passed to the orchestrator for storage via the
Orchestrator Client (Requirements A3.3, A3.5, B3.1, B3.2).

### Targets Module

The Targets Module manages the target URLs from which the crawlers query their data. It provides methods for storing and
deleting targets in the database. In addition, all targets that are assigned to at least one active schedule can be
queried (Requirement C1.3).

### Storages Module

The Storages Module manages the storage locations of the crawlers where the payload data is stored. It provides methods
for storing and deleting information about storage locations in the system's own database. Furthermore, it is possible
to query all storages, including their utilization, that are assigned to at least one active schedule. The utilization
of a storage is queried via the corresponding Mass Storage Client Strategy implementation (Requirement C1.4).

### Mass Storage Client Strategy Interface

The Mass Storage Client Strategy Interface defines the interface for storage-specific clients to query information about
the utilization of the respective storage locations (Requirement C1.4).

### Orchestrator Sync Module

The Orchestrator Sync Module is responsible for ensuring consistency between the data stored in the orchestrator and the
locally stored data. To do this, it queries all schedules from the Orchestrator Client at regular intervals and passes
them to the Schedules Module for comparison.
In addition, the associated crawler templates are queried for all locally stored schedules at regular intervals. The
module checks, on the one hand, whether the referenced crawler template still exists, and on the other hand, whether the
parameters defined in the schedule still match the required parameters of the crawler template. If inconsistencies are
detected, corresponding errors are passed to the Schedules Module for persistence and forwarded to the Notification
Event Manager as an alarm event (Requirements B3.3, C3.5).

### Health Module

The Health Module provides API endpoints for querying the system status, enabling a query about the status of the
Kubernetes cluster and the orchestrator, as well as the availability of the target URLs.
The status of the cluster and the orchestrator is checked via the Kubernetes Client and Orchestrator Client
respectively.
To check the reachability of the target URLs, all relevant targets are first queried from the Targets Module and their
reachability is subsequently checked. The utilization of the storage locations can also be queried via the Storages
Module (Requirements B1.1, C1.3).

### Kubernetes Module

The Kubernetes Module provides API endpoints for retrieving cluster information, such as utilization or available
priority classes. To do this, the module accesses the Kubernetes Client exclusively (Requirements B3.2, C1.1, C1.2).

### Notification Module

The Notification Module offers API endpoints for managing notification recipients and passes this information on to the
Notification Event Manager (Requirements C1.4, C3.5, C4.4).

### Notification Event Manager Module (Publisher-Subscriber Pattern)

The Notification Event Manager Module acts as a message broker in the publisher-subscriber pattern. The users represent
the subscribers who want to be alerted, and the alert sources act as publishers. The Event Manager offers the
possibility to add and delete users and to change their alert preferences.
In addition, the module provides an interface through which publishers can send events or alarms. If such an event is
received, the subscribers who have subscribed to this event are queried via the database and subsequently notified via
the desired alarm channel (e.g., mail) (Requirements C1.4, C3.5, C4.4).

### Alarmation Watcher Module

The Alarmation Watcher Module is a publisher of the Notification Event Manager.
It regularly checks the system status based on registered alarm strategies and forwards detected warnings as events to
the Notification Event Manager (Requirements C1.4, C3.5, C4.4).

### Alarmation Strategy Interface

The Alarmation Strategy Interface defines the interface for state monitoring strategies. Each strategy checks a specific
part of the overall system and returns a warning event in case of anomalies (Requirements C1.4, C3.5, C4.4).

### Queue Strategy

The Queue Strategy checks the state of the queues using the Kubernetes Client and returns a warning event in case of
overload (Requirement C1.4).

### Run Failure Strategy

The Run Failure Strategy queries failed runs via the Orchestrator Client since the last check and generates
corresponding warning events. If the orchestrator offers the capability to send API requests upon failed runs, an
endpoint could alternatively be provided to receive such requests and subsequently generate a matching warning event (
Requirement C4.4).

### Storage Strategy

The Storage Strategy monitors the utilization of the storage locations. The storages are retrieved from the Storages
Module, and the utilization is subsequently queried via the appropriate storage client. If defined thresholds are
exceeded, a warning event is returned (Requirement C1.4).

### Notification Client Strategy Interface

The Notification Client Strategy Interface defines the interface for strategies for sending notifications (Requirements
C1.4, C3.5, C4.4).

### Mailing Client Strategy

The Mailing Client Strategy implements the Notification Client Strategy Interface and provides an interface for sending
emails (Requirements C1.4, C3.5, C4.4).
