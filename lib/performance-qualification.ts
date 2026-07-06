export type QualificationParameterInput = {
  key: string;
  label: string;
  unit: string;
  applied: boolean;
  value?: number;
  lowLimit?: number;
  highLimit?: number;
};

export type QualificationParameterResult = {
  key: string;
  label: string;
  unit: string;
  value: number;
  lowLimit?: number;
  highLimit?: number;
  result: "pass" | "fail";
};

export function evaluatePerformanceQualification(parameters: QualificationParameterInput[]) {
  const applied = parameters.filter((parameter) => parameter.applied);
  if (!applied.length) {
    throw new Error("At least one performance parameter is required.");
  }

  const results = applied.map((parameter) => {
    if (parameter.value === undefined || !Number.isFinite(parameter.value)) {
      throw new Error(`${parameter.label} value is required.`);
    }
    if (parameter.lowLimit === undefined && parameter.highLimit === undefined) {
      throw new Error(`${parameter.label} acceptance criteria is required.`);
    }

    const lowPass = parameter.lowLimit === undefined || parameter.value >= parameter.lowLimit;
    const highPass = parameter.highLimit === undefined || parameter.value <= parameter.highLimit;

    return {
      key: parameter.key,
      label: parameter.label,
      unit: parameter.unit,
      value: parameter.value,
      lowLimit: parameter.lowLimit,
      highLimit: parameter.highLimit,
      result: lowPass && highPass ? "pass" : "fail"
    } satisfies QualificationParameterResult;
  });

  return {
    result: results.every((parameter) => parameter.result === "pass") ? ("pass" as const) : ("fail" as const),
    parameters: results
  };
}
