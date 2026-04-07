# 1. Requirements

For better traceability and to support the architectural work, the requirements are divided into different domains, each
containing both functional and non-functional requirements:

* **Operation, Deployment, and Maintainability:** This domain encompasses requirements for the stable operation of the
  application, its deployment, as well as its maintainability.
* **Security and User Management:** This domain describes requirements regarding authorization, authentication, and user
  management.
* **Workflow and Schedule Management:** This domain contains requirements for managing, versioning, and scheduling the
  execution of workflow templates.
* **Run Overview and Run Monitoring:** This domain outlines requirements regarding information on runs and related
  events.
* **Statistics:** This domain comprises requirements for visualizing metrics to evaluate the effectiveness and
  efficiency of runs and schedules.
* **Usability:** This domain covers requirements concerning the general user-friendliness of the application.

---

## Priority A Requirements (Must-Have Criteria)

### A1: Operation, Deployment, and Maintainability

**Non-functional requirements:**

* **A1.1 (Fulfilled):** The application must be deployable fully automated via CI/CD into the Kubernetes environment
  currently used in the project.
* **A1.2 (Fulfilled):** To guarantee system reliability, the application must automatically restart after crashes
  without data loss and without manual intervention.
* **A1.3 (Fulfilled):** The application must be independent of implementation details and the internal architecture of
  the crawlers, ensuring that adaptations to the crawlers do not require modifications in the management system.
* **A1.4 (Fulfilled):** To prevent vendor lock-in, the application must be designed so that changing the orchestration
  framework does not require a complete redevelopment, but merely the development of a client that matches the interface
  of the new orchestration framework.

**Functional requirements:**

* **A1.5 (Fulfilled):** The application must provide comprehensive logging to enable traceable error analysis.

### A2: Security and User Management

**Functional requirements:**

* **A2.1 (Fulfilled):** The application must be protected against unauthorized access through authentication and
  authorization.
* **A2.2 (Replaced):** The application must provide user management with at least two roles (read rights/write rights)
  to be able to restrict the permissions of specific users. (Replaced by fine-grained rights management C2.1)

### A3: Workflow and Schedule Management

**Functional requirements:**

* **A3.1 (Fulfilled):** Workflow templates must be versioned via Git to ensure traceability.
* **A3.2 (Fulfilled):** The application must offer the ability to manually start parameterized runs for workflow
  templates to enable one-time executions.
* **A3.3 (Fulfilled):** The application must provide a feature to define schedules for workflow templates, including
  different parameterizations per schedule, to enable regular automated execution of workflow templates and thereby
  ensure the timeliness of datasets.
* **A3.4 (Fulfilled):** The application must provide functionality that allows users to pause, resume, and delete
  schedules.
* **A3.5 (Fulfilled):** The application must support configurable retry mechanisms for schedules to improve error
  resilience.

### A4: Run Overview and Run Monitoring

**Functional requirements:**

* **A4.1 (Fulfilled):** The application must display all executed runs to offer users the ability to track run
  executions and obtain information about them.
* **A4.2 (Fulfilled):** The application must offer filtering of runs by the following parameters to facilitate finding
  specific runs:
    * Workflow template
    * Start and end date
    * Schedule
    * Current status

### A5: Statistics

**Functional requirements:**

* **A5.1 (Fulfilled):** The application must display statistics per run so they can be analyzed accordingly:
    * Number of collected datasets
    * Number of cache hits
    * Duration of the run
* **A5.2 (Fulfilled):** The application must display aggregated statistics per schedule to analyze the schedule's
  effectiveness and efficiency and to identify necessary changes based on this:
    * Total number of collected datasets
    * Number of collected datasets over time
    * Number of newly collected datasets over time
    * Ratio of newly collected datasets to total collected datasets over time

### A6: Usability

**Non-functional requirements:**

* **A6.1 (Fulfilled):** Controlling the crawlers must be fully executable via the graphical user interface, making it
  easy for non-technical users to use, as crawler control is not necessarily within the developers' scope of duties.

---

## Priority B Requirements (Should-Have Criteria)

### B1: Operation, Deployment, and Maintainability

**Functional requirements:**

* **B1.1 (Fulfilled):** The application should display a simple health status with information about the cluster and
  orchestrator to immediately provide an overview of potential problems.

### B2: Security and User Management

*There are no Priority B requirements for Security and User Management.*

### B3: Workflow and Schedule Management

**Functional requirements:**

* **B3.1 (Fulfilled):** The application should allow modifications to timetables, retry mechanisms, and parameters of
  existing schedules, for instance to easily implement necessary changes due to crawler adaptations.
* **B3.2 (Not fulfilled):** The application should offer the possibility to prioritize schedules for execution to ensure
  that more important schedules are executed.
* **B3.3 (Fulfilled):** The application should detect breaking changes in workflow templates and display a warning so
  that users are informed that their schedule executions will likely fail without adaptation.
* **B3.4 (Fulfilled):** The application should display the next planned run for each schedule so it is always known when
  datasets will be updated.

### B4: Run Overview and Run Monitoring

**Functional requirements:**

* **B4.1 (Fulfilled):** The application should display the progress of ongoing runs to allow monitoring and thereby the
  detection of potential deadlocks.
* **B4.2 (Not fulfilled):** The application should display run logs to enable a quick initial analysis in case of
  errors.
* **B4.3 (Fulfilled):** The application should be able to display crawler messages classified by urgency, meaning
  crawlers can explicitly point out potential issues and their current execution phase is always apparent.

### B5: Statistics

*There are no Priority B requirements for Statistics.*

### B6: Usability

*There are no Priority B requirements for Usability.*

---

## Priority C Requirements (Could-Have Criteria)

### C1: Operation, Deployment, and Maintainability

**Functional requirements:**

* **C1.1 (Not fulfilled):** The application could display the current cluster utilization to identify necessary
  adjustments to the provided infrastructure at an early stage.
* **C1.2 (Not fulfilled):** The application could visualize the current run queue, making it quickly evident if the
  current
  infrastructure is no longer sufficient for the crawlers' execution frequency.
* **C1.3 (Fulfilled):** The application could automatically check the accessibility of target URLs and display warnings
  to hint at probable issues during schedule execution.
* **C1.4 (Not fulfilled):** The application could dispatch alerts for specific events to allow timely manual
  intervention before
  problems even occur:
    * Overfilled queue
    * Storage scarcity in the dataset data storages

### C2: Security and User Management

**Functional requirements:**

* **C2.1 (Fulfilled):** The application could provide fine-grained permissions management to restrict users to exactly
  the functions they are authorized for.

### C3: Workflow and Schedule Management

**Functional requirements:**

* **C3.1 (Not fulfilled):** The application could support one-time scheduled runs, enabling test executions during times
  with
  expected low utilization.
* **C3.2 (Not fulfilled):** The application could display an overview of all planned schedule executions to centrally
  ensure that
  executions do not undesirably accumulate at specific times.
* **C3.3 (Not fulfilled):** The application could visualize the structure of individual crawlers to provide an overview
  of how
  they function.
* **C3.4 (Not fulfilled):** The application could offer a feature to create workflow templates directly via the user
  interface,
  enabling technically inexperienced users to manage template creation.
* **C3.5 (Not fulfilled):** The application could alert users of breaking changes in a schedule's workflow templates,
  warning
  them of potential errors prior to the next run and allowing them the chance to make necessary adjustments.

### C4: Run Overview and Run Monitoring

**Functional requirements:**

* **C4.1 (Not fulfilled):** The application could display the resource consumption of a run to uncover indications of
  excessive
  resource usage.
* **C4.2 (Not fulfilled):** The application could display warnings for suspicious run behavior to help identify problems
  during
  run execution:
    * Unusually short or long runtimes
    * Unusually low number of newly collected datasets
* **C4.3 (Not fulfilled):** The application could provide the feature to pause runs between individual processing steps
  to free
  up resources for other, potentially more important, executions.
* **C4.4 (Not fulfilled):** The application could alert users about failed runs.

### C5: Statistics

*There are no Priority C requirements for Statistics.*

### C6: Usability

*There are no Priority C requirements for Usability.*