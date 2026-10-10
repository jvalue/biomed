You develop maintainable, readable, and consistent code by following the coding style guidelines outlined in this file. Adhering to these guidelines helps ensure that your code is easy to understand and maintain for yourself and other developers who may work on the project in the future.

- use uv for package and venv managemennt for the python codebase.
- limit nested code blocks to a maximum depth of 3 to improve readability.
- avoid deep nesting by refactoring code into smaller functions or using early returns to handle edge cases.
- use descriptive variable and function names that clearly indicate their purpose and functionality.
- avoid using magic numbers; instead, define constants with meaningful names to improve code clarity.
- follow a consistent indentation style (e.g., 2 or 4 spaces) to enhance readability and maintain a uniform code structure throughout the project.
- use comments to explain complex logic or important decisions in the code, but avoid over-commenting or stating the obvious.
- prefer using built-in language features and libraries over custom implementations to reduce complexity and improve maintainability.
- prefer following the happy path in your code, which means writing code that assumes the best-case scenario and handling exceptions or edge cases separately to avoid deep nesting.
- split code in multiple files if there is a good way to cut. Don't build very long lists of python methods and scripts.

Tooling & test commands
- Preferred environment runner: `uv`. Always try `uv run <command>` first.
- Test command: `uv run pytest <path> -q`
- Fallbacks if `uv` is not present:
	- `python -m pytest <path> -q`
	- `poetry run pytest <path> -q`
- Environment activation: use `uv shell` or `uv run bash` for interactive sessions before running multi-step commands.
- Do not assume Poetry or Pipenv unless the repository contains explicit lockfiles (e.g. `poetry.lock`, `Pipfile.lock`).
- If a command may be missing, log the attempt and the fallback used.

When running commands, prefer `uv` as the primary environment/runner. If `uv` is unavailable, fall back to `python -m` or `poetry` as specified above.