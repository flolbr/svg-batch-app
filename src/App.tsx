import { AppShell, Button, Group, Stack, Text, Title } from "@mantine/core";

export function App() {
  return (
    <AppShell padding="md">
      <AppShell.Main>
        <Stack gap="md" maw={760} mx="auto">
          <div>
            <Title order={1}>SVG Batch Generator</Title>
            <Text c="dimmed">
              Starter shell only. Implement the application by following
              docs/plan/00-TODO.md.
            </Text>
          </div>

          <Group>
            <Button>Import SVG</Button>
            <Button variant="default">Import spreadsheet</Button>
          </Group>

          <Text>
            UI reference: docs/plan/assets/ui-reference.png
          </Text>
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}
