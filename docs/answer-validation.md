# Answer validation (#40)

Types: [AnswerValidator.ts](../src/model/AnswerValidator.ts).
Implementation: [DefaultAnswerValidator.ts](../src/model/DefaultAnswerValidator.ts).

| Owner | Provides |
| --- | --- |
| UI/controller (#25) | Parsed numerical answers and fixed unit labels |
| Physics/problem subteam | Current problem's expected answers, tolerance, and optional bounds |
| Validator (#40) | Submitted answer, `correct`, and `feedback` |

The controller displays feedback and records the attempt after playback (#26).

- `validateInput(input, level)`: checks game/level identity, required fields, finite values, and bounds (including this because is is specified in the static view).
- `validateAnswer(input, level)`: also checks correctness; the controller can call this directly.
- Every required answer must pass. Bounds and tolerance endpoints are inclusive.
- Allowed error: `max(absolute, relative * abs(expected))`; relative defaults to zero.
- Units are preserved without conversion. Extra submitted fields are ignored.
- Invalid problem configuration throws an `Error`; invalid player input returns `false` or an incorrect result with feedback.
- Always supply the active problem configuration, including updated expected answers after regeneration.

Example:

```ts
import type { AnswerSubmission, LevelDataConfig } from "../src/model/AnswerValidator";
import { DefaultAnswerValidator } from "../src/model/DefaultAnswerValidator";

declare const problem: LevelDataConfig;
declare const input: AnswerSubmission;
const validator = new DefaultAnswerValidator();

const result = validator.validateAnswer(input, problem);
// result.correct indicates whether the answer is correct.
```

Both minigames use the same validator with their own configurations.
Run `npm test` for sample configurations and validation behavior.
