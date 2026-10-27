# Answer validation (#40)

Interface proposal only; implementation follows review.
Types: [AnswerValidator.ts](../src/model/AnswerValidator.ts).

| Owner | Provides |
| --- | --- |
| UI/controller (#25) | Parsed numerical answers and fixed unit labels |
| Physics/problem subteam | Current problem's expected answers, tolerance, and optional bounds |
| Validator (#40) | Submitted answer, `correct`, and `feedback` |

The controller displays feedback and records the attempt after playback (#26).

- `validateInput(input, level)`: checks level ID, required fields, finite values, and bounds.
- `validateAnswer(input, level)`: also checks correctness; the controller can call this directly.
- Every required answer must pass. Bounds and tolerance endpoints are inclusive.
- Allowed error: `max(absolute, relative * abs(expected))`; relative defaults to zero.
- Units are preserved without conversion. Invalid problem configuration is a developer error.

Example after a validator implementation exists:

```ts
declare const problem: LevelDataConfig;
declare const input: AnswerSubmission;
declare const validator: AnswerValidator;

const result = validator.validateAnswer(input, problem);
// result.correct indicates whether the answer is correct.
```