# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-17

### Added

- Express middleware to record API traffic (`apiReplay()`)
- File-based storage layer with async I/O
- Replay engine with `baseUrl` override and request overrides
- Deep recursive diff engine with colored CLI output
- Header and body sanitization for sensitive data
- CLI tool with `list`, `show`, and `replay` commands
- TypeScript type definitions
- Body size limits (configurable, default 1MB)
- Request timeout support (default 30s, configurable)
- Path traversal protection in storage layer
- 53 tests passing

### Security

- Deep recursive masking for nested objects and arrays
- Configurable header and body field masking
- Safe JSON serialization (handles circular references)

[1.0.0]: https://github.com/ashok1706/api-traffic-replay/releases/tag/v1.0.0
