import { Alert, Button, Center, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Component, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Center mih="100vh" p="xl">
          <Alert
            color="red"
            icon={<IconAlertTriangle />}
            title={
              <Title order={1} size="h3">
                Something went wrong
              </Title>
            }
            maw={520}
          >
            <Stack gap="md">
              <Text size="sm">
                The application could not continue. Your saved project data
                remains safe.
              </Text>
              <Button
                color="red"
                onClick={() => window.location.reload()}
                w="fit-content"
              >
                Reload application
              </Button>
            </Stack>
          </Alert>
        </Center>
      );
    }

    return this.props.children;
  }
}
