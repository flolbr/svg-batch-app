import { findElementById } from "../mappings/mappingUtils";
import { mappingTypesForTarget } from "../mappings/mappingStatus";
import type { Mapping } from "../mappings/schema";
import type { ValidationIssue } from "../mappings/validation";

export type MappingConfigurationResult = {
  applicableMappings: Mapping[];
  issues: ValidationIssue[];
};

function configurationIssue(
  mapping: Mapping,
  code: string,
  message: string,
): ValidationIssue {
  return {
    level: "error",
    code,
    message,
    mappingId: mapping.id,
    targetId: mapping.targetId,
    columnId: mapping.columnId,
  };
}

export function validateMappingConfiguration(
  template: SVGSVGElement,
  columnIds: ReadonlySet<string>,
  mappings: readonly Mapping[],
): MappingConfigurationResult {
  const issues: ValidationIssue[] = [];
  const applicableMappings: Mapping[] = [];

  for (const mapping of mappings) {
    const mappingIssues: ValidationIssue[] = [];
    if (!columnIds.has(mapping.columnId)) {
      mappingIssues.push(
        configurationIssue(
          mapping,
          "missing-column",
          "Mapped column is unavailable.",
        ),
      );
    }

    const target = findElementById(template, mapping.targetId);
    if (!target) {
      mappingIssues.push(
        configurationIssue(
          mapping,
          "missing-target",
          "Mapped target is unavailable.",
        ),
      );
    } else if (
      !mappingTypesForTarget(target.localName).includes(mapping.type)
    ) {
      mappingIssues.push(
        configurationIssue(
          mapping,
          "incompatible-target",
          "Mapping type is incompatible with mapped target.",
        ),
      );
    }

    if (mappingIssues.length === 0) applicableMappings.push(mapping);
    else issues.push(...mappingIssues);
  }

  return { applicableMappings, issues };
}

function isEmbeddedReference(reference: string): boolean {
  return reference.startsWith("#") || /^data:/i.test(reference);
}

function externalResourceIssue(
  element: Element,
  rowId: string,
  reference: string,
): ValidationIssue {
  return {
    level: "error",
    code: "external-resource",
    message: `External resource "${reference}" is not embedded.`,
    rowId,
    targetId: element.getAttribute("id") ?? undefined,
  };
}

export function validateExternalResources(
  svg: SVGSVGElement,
  rowId: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const elements = [svg, ...Array.from(svg.getElementsByTagName("*"))];

  for (const element of elements) {
    const seen = new Set<string>();
    for (const attribute of Array.from(element.attributes)) {
      const value = attribute.value.trim();
      if (
        attribute.localName.toLowerCase() === "href" &&
        value !== "" &&
        !isEmbeddedReference(value)
      ) {
        seen.add(value);
      }

      for (const match of value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
        const reference = match[2].trim();
        if (reference && !isEmbeddedReference(reference)) seen.add(reference);
      }
    }
    seen.forEach((reference) => {
      issues.push(externalResourceIssue(element, rowId, reference));
    });
  }

  return issues;
}
