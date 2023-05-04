import {
  SlButton,
  SlInput,
  SlOption,
  SlSelect,
  SlSpinner,
} from '@shoelace-style/shoelace/dist/react';
import {JSONSchema7Type} from 'json-schema';
import * as React from 'react';
import styles from './DatasetLoader.module.css';
import {JSONSchemaForm} from './JSONSchemaForm';
import {
  useGetSourceSchemaQuery,
  useGetSourcesQuery,
  useLoadDatasetMutation,
} from './store/apiDataset';
import {useLazyGetTaskManifestQuery} from './store/store';
import {getDatasetLink, renderError, renderQuery} from './utils';

const DATASET_TASK_POLL_INTERVAL_MS = 500;

export const DatasetLoader = (): JSX.Element => {
  const sources = useGetSourcesQuery();
  const [loadTaskManifest, taskManifest] = useLazyGetTaskManifestQuery();

  const [namespace, setNamespace] = React.useState<string>('local');
  const [datasetName, setDatasetName] = React.useState<string>('');
  const [sourceName, setSourceName] = React.useState<string>('');
  // For polling when the task is ready to redirect the user to the datasets page.
  const [taskId, setTaskId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<{[key: string]: JSONSchema7Type}>({});

  const sourceSchema = useGetSourceSchemaQuery({sourceName: sourceName!}, {skip: sourceName == ''});

  const sourcesSelect = renderQuery(sources, (sources) => (
    <div className="w-60 font-light">
      <SlSelect
        size="medium"
        value={sourceName}
        label="Data loader"
        hoist={true}
        clearable
        onSlChange={(e) => setSourceName((e.target as HTMLInputElement).value)}
      >
        {sources.sources.map((sourceName) => (
          <SlOption key={sourceName} value={sourceName}>
            {sourceName}
          </SlOption>
        ))}
      </SlSelect>
    </div>
  ));

  const [
    loadDataset,
    {
      isLoading: isLoadDatasetLoading,
      isError: isLoadDatasetError,
      error: loadDatasetError,
      isSuccess: isLoadDatasetSuccess,
    },
  ] = useLoadDatasetMutation();

  const loadDatasetButtonDisabled =
    sources.currentData == null ||
    sourceSchema.currentData == null ||
    datasetName == '' ||
    namespace == '';

  const sourceFieldsForm = renderQuery(sourceSchema, (sourceSchema) =>
    sourceSchema != null ? (
      <div className={styles.row}>
        <JSONSchemaForm
          schema={sourceSchema}
          ignoreProperties={['source_name']}
          onFormData={(formData) => setFormData(formData)}
        ></JSONSchemaForm>
      </div>
    ) : (
      <></>
    )
  );

  const loadClicked = async () => {
    const response = await loadDataset({
      sourceName: sourceName!,
      options: {
        config: formData,
        namespace,
        dataset_name: datasetName,
      },
    }).unwrap();

    // Set the task ID, triggering the polling for the task below.
    setTaskId(response.task_id);
  };

  // Poll for the task to be ready when the task is defined.
  React.useEffect(() => {
    if (taskId == null) {
      return;
    }
    const timer = setInterval(() => loadTaskManifest(), DATASET_TASK_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadTaskManifest, taskId]);

  let loadDatasetTaskError: string | null = null;
  if (
    taskId != null &&
    taskManifest.currentData != null &&
    taskManifest.currentData.tasks != null
  ) {
    if (taskManifest.currentData.tasks[taskId]?.status == 'completed') {
      location.href = getDatasetLink(namespace, datasetName);
    } else {
      loadDatasetTaskError = taskManifest.currentData.tasks[taskId]?.error || '';
    }
  }

  return (
    <div className={`h-full overflow-y-scroll ${styles.container}`}>
      <div className={`mt-2 flex flex-col border border-slate-300 px-4 shadow-lg`}>
        <div className={styles.row}>
          <div className="text-2xl font-light">Create a dataset</div>
        </div>
        <div className={styles.row}>
          <div className="justify-left items-left flex flex-grow flex-row">
            <div className="w-44 font-light">
              <SlInput
                value={namespace}
                label="namespace"
                required={true}
                onSlChange={(e) => setNamespace((e.target as HTMLInputElement).value)}
              />
            </div>
            <div className="mx-4">
              <span className="inline-block pt-8 align-text-bottom text-xl">/</span>
            </div>
            <div className="w-44 font-light">
              <SlInput
                value={datasetName}
                label="name"
                required={true}
                onSlChange={(e) => setDatasetName((e.target as HTMLInputElement).value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.row}>{sourcesSelect}</div>
        {sourceFieldsForm}
        <div className={styles.row}>
          <SlButton
            disabled={loadDatasetButtonDisabled}
            variant="success"
            className="mr-4 mt-1"
            onClick={() => loadClicked()}
          >
            Load dataset
          </SlButton>
          {isLoadDatasetLoading ? <SlSpinner></SlSpinner> : null}
          {isLoadDatasetError ? renderError(loadDatasetError) : null}
          {loadDatasetTaskError ? (
            renderError(loadDatasetTaskError)
          ) : isLoadDatasetSuccess ? (
            <>
              <SlSpinner></SlSpinner>
              <br />
              <div className="mt-2 text-gray-500">
                <p>Loading dataset with task_id "{taskId}".</p>
                <p>You will be redirected when it is complete. You may leave this page now.</p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};