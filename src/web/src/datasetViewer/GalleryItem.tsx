import * as React from 'react';

import {useGetItem} from '../hooks/useGetItem';
import {getLeafVals, Item, LeafValue, Path, serializePath} from '../schema';
import {renderError, renderPath} from '../utils';
import './DatasetViewer.module.css';

export interface GalleryItemProps {
  namespace: string;
  datasetName: string;
  itemId: string;
  mediaPaths: Path[];
  metadataPaths?: Path[];
}

/** Renders an individual value. Rounds floating numbers to 3 decimals. */
function renderValue(val: LeafValue): string {
  if (val == null) {
    return 'N/A';
  }
  if (typeof val === 'number') {
    return val.toLocaleString(undefined, {maximumFractionDigits: 3});
  }
  return val.toString();
}

/** Renders an individual item, which can be an arbitrary nested struct with lists. */
function renderCell(item: Item, path: Path): string {
  const leafVals = getLeafVals(item);
  const vals = leafVals[serializePath(path)];
  if (vals == null) {
    // The path doesn't exist in this item.
    return 'N/A';
  }
  if (vals.length === 1) {
    return renderValue(vals[0]);
  }
  return vals.map((v) => renderValue(v)).join(', ');
}

function Media({
  item,
  path,
  showLabel,
}: {
  item: Item | null;
  path: Path;
  showLabel: boolean;
}): JSX.Element {
  const label = renderPath(path);
  const mediaContent = item != null ? renderCell(item, path) : 'Loading...';
  return (
    <div>
      {showLabel && <div className="text-sm text-gray-400">{label}</div>}
      <div className="break-words text-gray-900">{mediaContent}</div>
    </div>
  );
}

function Metadata({item, paths}: {item: Item | null; paths?: Path[]}): JSX.Element {
  if (paths == null || paths.length == 0) {
    return <></>;
  }
  const metadata = paths.map((path) => {
    const pathKey = serializePath(path);
    const pathStr = renderPath(path);
    const content = item != null ? renderCell(item, path) : 'Loading...';
    return (
      <div className="flex flex-col" key={pathKey}>
        <div className="font-mono text-gray-400">{pathStr}</div>
        <div className="line-clamp-2 overflow-x-hidden break-words font-mono text-gray-500">
          {content}
        </div>
      </div>
    );
  });
  return <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs">{metadata}</div>;
}

export const GalleryItem = React.memo(function GalleryItem({
  namespace,
  datasetName,
  itemId,
  mediaPaths,
  metadataPaths,
}: GalleryItemProps): JSX.Element {
  const {item, error} = useGetItem({namespace, datasetName, itemId});
  if (error) {
    return <div>{renderError(error)}</div>;
  }
  const medias = mediaPaths.map((path) => {
    return (
      <Media key={serializePath(path)} item={item} path={path} showLabel={mediaPaths.length > 1} />
    );
  });

  return (
    <div className="flex flex-col gap-y-4 px-4 py-8 hover:bg-gray-50">
      {medias}
      <Metadata item={item} paths={metadataPaths} />
    </div>
  );
});