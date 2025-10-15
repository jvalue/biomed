"""
Demo DAG using Airflow's TaskFlow API (new Pythonic syntax)

This DAG demonstrates:
- TaskFlow API with @task decorator
- Data passing between tasks using XCom
- Dynamic task generation
- Mixed traditional and TaskFlow tasks
"""

from datetime import datetime, timedelta

from airflow.providers.standard.operators.bash import BashOperator
from airflow.sdk import dag, task


# Default arguments for the DAG
default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}


@dag(
    dag_id="demo_taskflow_dag",
    default_args=default_args,
    description="A demo DAG using TaskFlow API",
    schedule="@daily",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["demo", "taskflow"],
)
def demo_taskflow():
    """
    Demo DAG definition using TaskFlow API
    """

    # TaskFlow task: Extract data
    @task()
    def extract():
        """
        Extract task - simulates data extraction
        Returns a dictionary that will be passed to the next task
        """
        data = {
            "name": "Airflow",
            "version": "3.1.0",
            "features": ["TaskFlow API", "Dynamic DAGs", "Data-aware scheduling"],
        }
        print(f"Extracted data: {data}")
        return data

    # TaskFlow task: Transform data
    @task()
    def transform(data: dict):
        """
        Transform task - processes the data from extract task
        """
        transformed = {
            "project": data["name"],
            "version": data["version"],
            "feature_count": len(data["features"]),
            "features_uppercase": [f.upper() for f in data["features"]],
        }
        print(f"Transformed data: {transformed}")
        return transformed

    # TaskFlow task: Load data
    @task()
    def load(data: dict):
        """
        Load task - simulates loading data to a destination
        """
        print("Loading data to destination...")
        print(f"Project: {data['project']}")
        print(f"Version: {data['version']}")
        print(f"Total features: {data['feature_count']}")
        print(f"Features: {', '.join(data['features_uppercase'])}")
        return "Data loaded successfully!"

    # TaskFlow task: Multiple outputs example
    @task(multiple_outputs=True)
    def get_statistics():
        """
        Demonstrates a task with multiple outputs
        """
        return {"total_tasks": 5, "execution_date": datetime.now().isoformat(), "status": "running"}

    # Traditional BashOperator (can be mixed with TaskFlow)
    print_date = BashOperator(
        task_id="print_date",
        bash_command="date",
    )

    # TaskFlow task: Summary
    @task()
    def print_summary(load_result: str, stats: dict):
        """
        Final task that summarizes the DAG execution
        """
        print("=" * 50)
        print("DAG Execution Summary")
        print("=" * 50)
        print(f"Load result: {load_result}")
        print(f"Total tasks: {stats['total_tasks']}")
        print(f"Execution date: {stats['execution_date']}")
        print(f"Status: {stats['status']}")
        print("=" * 50)

    # Define task dependencies using the TaskFlow API
    # Data flows automatically through the tasks
    extracted_data = extract()
    transformed_data = transform(extracted_data)
    load_result = load(transformed_data)
    stats = get_statistics()

    # Set dependencies
    # print_date runs first, then the ETL pipeline, then the summary
    print_date >> extracted_data
    print_summary(load_result, stats)


# Instantiate the DAG
demo_dag = demo_taskflow()
