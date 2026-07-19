# Contributing to GTA 2 Style Game

Thank you for considering contributing to this project! Here are some guidelines to help you get started.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project.

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please create an issue with the following information:

- A clear, descriptive title
- Steps to reproduce the bug
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Browser and OS information

### Suggesting Enhancements

If you have an idea for an enhancement, please create an issue with:

- A clear, descriptive title
- A detailed description of the enhancement
- Any relevant mockups or examples

### Pull Requests

1. Fork the repository
2. Create a new branch for your feature or bugfix
3. Make your changes
4. Test your changes thoroughly
5. Submit a pull request with a clear description of the changes

## Development Setup

1. Clone the repository

```
git clone https://github.com/yourusername/gta2-style-game.git
```

2. Start a local web server in the project directory

```
# Using Python 3
python -m http.server

# Using Node.js
npx serve
```

3. Open your browser and navigate to `http://localhost:8000` (or the port your server is using)

## Project Structure

- `js/core/` - Core game functionality
- `js/entities/` - Game entities like buildings, vehicles, and characters
- `js/generators/` - Procedural generation classes
- `js/managers/` - Game system managers
- `js/ui/` - User interface components
- `js/utils/` - Utility functions and helpers

## Coding Guidelines

- Use meaningful variable and function names
- Add comments for complex logic
- Follow the existing code style
- Keep functions small and focused on a single task
- Write modular, reusable code

## Testing

Please test your changes in multiple browsers if possible, especially if you're making UI changes.

## Documentation

If you add new features, please update the README.md file accordingly.

Thank you for contributing!
