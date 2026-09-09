# Contributing to Neural Texture Engine

Thank you for contributing to **Neural Texture Engine**, a WebGPU-accelerated real-time neural super-resolution and texture synthesis pipeline.

## Setup & Testing

```bash
npm install
npx vitest run
```

### Development Guidelines

- **WebGPU Shader Code**: Ensure WGSL compute shaders compile without errors across both Chrome and Firefox Nightly.
- **WebGL2 Fallback**: Ensure any WebGPU compute path gracefully falls back to WebGL2 if the device execution time exceeds 16ms or if WebGPU is unsupported.
- **Testing**: Add unit tests in `src/` for any new mathematical or capability profiling logic.

## Contribution Workflow

1. Fork the repo and create a feature branch (`git checkout -b feat/my-feature`).
2. Run `npx vitest run` to verify tests pass.
3. Submit a Pull Request with a clear description of your changes.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
