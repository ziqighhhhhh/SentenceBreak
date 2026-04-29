export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

const tokenPattern = /\s+|[\w'-]+|[^\s\w]/g;

function tokenize(value: string): string[] {
  return value.match(tokenPattern) ?? [];
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function shouldCompare(value: string): boolean {
  return normalizeToken(value).length > 0;
}

function buildLcsMatrix(previous: string[], current: string[]): number[][] {
  const matrix = Array.from({ length: previous.length + 1 }, () => Array(current.length + 1).fill(0) as number[]);

  for (let prevIndex = previous.length - 1; prevIndex >= 0; prevIndex -= 1) {
    for (let currentIndex = current.length - 1; currentIndex >= 0; currentIndex -= 1) {
      matrix[prevIndex][currentIndex] = previous[prevIndex] === current[currentIndex]
        ? matrix[prevIndex + 1][currentIndex + 1] + 1
        : Math.max(matrix[prevIndex + 1][currentIndex], matrix[prevIndex][currentIndex + 1]);
    }
  }

  return matrix;
}

function mergeSegments(segments: HighlightSegment[]): HighlightSegment[] {
  return segments.reduce<HighlightSegment[]>((merged, segment) => {
    const last = merged[merged.length - 1];

    if (last && last.highlighted === segment.highlighted) {
      return [
        ...merged.slice(0, -1),
        {
          ...last,
          text: last.text + segment.text,
        },
      ];
    }

    return [...merged, segment];
  }, []);
}

export function getAddedTextSegments(previousText: string, currentText: string): HighlightSegment[] {
  const previousTokens = tokenize(previousText);
  const currentTokens = tokenize(currentText);
  const comparablePrevious = previousTokens.filter(shouldCompare).map(normalizeToken);
  const comparableCurrent = currentTokens.filter(shouldCompare).map(normalizeToken);
  const matrix = buildLcsMatrix(comparablePrevious, comparableCurrent);
  const matchedCurrentIndexes = new Set<number>();
  let prevIndex = 0;
  let currentIndex = 0;

  while (prevIndex < comparablePrevious.length && currentIndex < comparableCurrent.length) {
    if (comparablePrevious[prevIndex] === comparableCurrent[currentIndex]) {
      matchedCurrentIndexes.add(currentIndex);
      prevIndex += 1;
      currentIndex += 1;
      continue;
    }

    if (matrix[prevIndex + 1][currentIndex] >= matrix[prevIndex][currentIndex + 1]) {
      prevIndex += 1;
      continue;
    }

    currentIndex += 1;
  }

  let comparableIndex = 0;
  const segments = currentTokens.map((token) => {
    if (!shouldCompare(token)) {
      return {
        text: token,
        highlighted: false,
      };
    }

    const highlighted = !matchedCurrentIndexes.has(comparableIndex);
    comparableIndex += 1;

    return {
      text: token,
      highlighted,
    };
  });

  return mergeSegments(segments);
}
