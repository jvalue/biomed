# 6. Runtime View

Runtime views describe the concrete behavior and interactions of the system's building blocks in relation to important
use cases and features.

## 6.1 User Workflow

The following sequence diagram vividly illustrates how the user workflow functions within the system, from user
registration and permission assignment to user deactivation.

![user_registration_workflow.png](user_registration_workflow.png)
*(Figure 3: Runtime View - User Workflow)*

First, the creation of new users is considered. To keep the manual effort for admins during user creation as low as
possible, a special workflow was developed for this.
Initially, every user can independently register with the application.

Following this, the user data is sent to the management backend and stored in the database with the status `PENDING`.
If a user with the `PENDING` status logs in, the response code `403` is returned, and a corresponding error message is
displayed.
To gain access to the application, a user with the appropriate permissions, hereinafter referred to as an Admin, must
first approve the newly registered user. After this, the user initially possesses only very minimal permissions.
Once a user has been approved, an admin can assign further permissions. Here, they define for each resource which
permissions the user should have, for example, the rights to create new runs (see "Authentication and Authorization").
If a user should eventually no longer have access to the application, the admin can block them, whereupon login attempts
will return the error code `403` and the user will receive an error message.

## 6.2 Schedule Creation

For better understanding, the process of creating a time-controlled execution (schedule) is graphically described using
a sequence diagram, taking Argo Workflows as an example.

![schedule_creation_workflow.png](schedule_creation_workflow.png)
*(Figure 4: Runtime View - Schedule Creation)*

To create a schedule, the user must first navigate to the Crawler Template overview page. This retrieves all Crawler
Templates from the backend, which in the example of Argo Workflows, entails fetching all Workflow Templates from the
Argo Server. Subsequently, the user creates a schedule for one of the templates, which sends the necessary information
to the backend, where it is finally processed. In the backend, the Schedules Module receives the request and initially
passes the information for creating the schedule to the Schedule Engine. In the case of Argo Workflows, the engine
builds a valid YAML document from the information and then sends it to the Argo Server for storage.
Subsequently, the Schedules Module extracts all Target and Storage parameters from the schedule's parameters and sends
them to the respective module for storage in the database. Finally, the Schedules Module stores the schedule itself in
the database, including the references to the recognized targets and storages.

## 6.3 Alerting Workflow

The following sequence diagram exemplifies the alerting process, from a user subscribing to a specific event to the
alert being sent via the specified alerting channel.

![alerting_workflow.png](alerting_workflow.png)
*(Figure 5: Runtime View - Alerting Workflow)*

First, the user navigates to the notifications overview page, where all their current notification subscriptions are
listed. This information is retrieved via the backend's Notification Module, which in turn obtains it from the database
via the Notification Event Manager.
Then, the user subscribes to an additional alert in the frontend, in this example, a specific storage. This information
is sent via an API request to the backend's Notification Module and is subsequently stored in the database via the
Notification Event Manager.
At regular intervals, the Alarmation Watcher sends commands for verification to all registered alerting strategies.
Thus, the Storage Strategy also receives such a command, retrieves all active storages from the Storages Module, and
checks the fill level of each location via the respective Storage Client. If a defined threshold is exceeded, an alert
event for the respective storage is returned to the Alarmation Watcher, which then sends an event to the Notification
Event Manager.
The Notification Event Manager queries the database for all users who have subscribed to the notification type and the
specified resource. Afterwards, it sends a corresponding notification via the user's chosen alerting channel, for
example, via email.
