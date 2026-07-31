import { Badge, Group, Modal, Paper, Stack, Text, Title } from "@mantine/core";
import type { ValidationIssue } from "./mappings/validation";
import {
  buildValidationReport,
  type ValidationIssueTypeGroup,
} from "./validation/validationReport";
import type { ValidationPipelineResult } from "./validation/validationPipeline";

const levelColors: Record<ValidationIssue["level"], string> = {
  error: "red",
  warning: "yellow",
  info: "blue",
};

function issueTypeLabel(code: string): string {
  return code
    .split("-")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function IssueTypes({ groups }: { groups: ValidationIssueTypeGroup[] }) {
  return (
    <Stack gap="sm">
      {groups.map((group) => {
        const messageCounts = new Map<string, number>();
        group.issues.forEach((issue) => {
          messageCounts.set(
            issue.message,
            (messageCounts.get(issue.message) ?? 0) + 1,
          );
        });

        return (
          <div key={`${group.level}:${group.code}`}>
            <Group gap="xs">
              <Badge color={levelColors[group.level]} variant="light">
                {issueTypeLabel(group.code)}
              </Badge>
              {group.issues.length > 1 && (
                <Text c="dimmed" size="xs">
                  {group.issues.length} issues
                </Text>
              )}
            </Group>
            <Stack component="ul" gap={2} mt={4} mb={0} pl="lg">
              {Array.from(messageCounts).map(([message, count]) => (
                <Text component="li" key={message} size="sm">
                  {message}
                  {count > 1 ? ` ×${count}` : ""}
                </Text>
              ))}
            </Stack>
          </div>
        );
      })}
    </Stack>
  );
}

export function ValidationReportModal({
  opened,
  onClose,
  result,
  rowLabels,
}: {
  opened: boolean;
  onClose: () => void;
  result: ValidationPipelineResult | null;
  rowLabels?: ReadonlyMap<string, string>;
}) {
  const report = result ? buildValidationReport(result) : null;

  return (
    <Modal
      centered
      closeButtonProps={{ "aria-label": "Close validation report" }}
      onClose={onClose}
      opened={opened}
      size="lg"
      title="Validation report"
    >
      {report && (
        <Stack gap="md">
          {report.totalIssues === 0 ? (
            <Text c="green" fw={600} role="status">
              No validation issues found.
            </Text>
          ) : (
            <Group gap="xs" role="status">
              <Text fw={600}>
                {report.totalIssues}{" "}
                {report.totalIssues === 1 ? "issue" : "issues"} found
              </Text>
              {(["error", "warning", "info"] as const).map(
                (level) =>
                  report.counts[level] > 0 && (
                    <Badge
                      color={levelColors[level]}
                      key={level}
                      variant="light"
                    >
                      {report.counts[level]} {level}
                    </Badge>
                  ),
              )}
            </Group>
          )}

          {report.projectIssueTypes.length > 0 && (
            <Paper p="sm" withBorder>
              <Title order={3} size="sm" mb="xs">
                Project
              </Title>
              <IssueTypes groups={report.projectIssueTypes} />
            </Paper>
          )}

          {report.rows.map((row) => {
            const issueCount = row.issueTypes.reduce(
              (total, group) => total + group.issues.length,
              0,
            );
            return (
              <Paper component="details" key={row.rowId} p="sm" withBorder>
                <Text component="summary" fw={600}>
                  {rowLabels?.get(row.rowId) ?? row.rowId} · {issueCount}{" "}
                  {issueCount === 1 ? "issue" : "issues"}
                </Text>
                <Stack mt="sm">
                  <IssueTypes groups={row.issueTypes} />
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Modal>
  );
}
