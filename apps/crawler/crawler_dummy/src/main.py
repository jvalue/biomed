import time


def main():
    with open("progress.txt", "w") as f:
        for i in range(1, 101):
            f.write(f"{i}\n")
            f.flush()
            print(f"Progress: {i}/100")
            time.sleep(1)


if __name__ == "__main__":
    main()
