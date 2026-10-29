/**
 * A unique identifier for a particular level belonging to a game, it moves as a pair. Not a pointer.
 */
export interface LevelAddress {
  readonly gameId: string;
  readonly levelId: number;
}
