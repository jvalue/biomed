"""Sample Hello World application."""


def hello():
    """Return a friendly greeting."""
    print("Hello crawler-general")
    return "Hello crawler-general"


hello()
import time

def main():
    with open("progress.txt", "w") as f:
        for i in range(1, 101):
            f.write(f"{i}\n")
            f.flush()
            print(f"Progress: {i}/100")
            time.sleep(0.1)

if __name__ == "__main__":
    main()
