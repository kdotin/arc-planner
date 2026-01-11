"use client";

import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo } from "react";
import TableNode from "./table-node";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Maximize2 } from "lucide-react";

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  defaultValue: string | null;
  checkConstraint: string | null;
}

interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

interface Table {
  name: string;
  schema: string;
  columns: Column[];
  primaryKeys: string[];
  foreignKeys: ForeignKey[];
}

interface SchemaDiagramProps {
  tables: Table[];
}

const nodeTypes = {
  tableNode: TableNode,
};

function calculateLayout(tables: Table[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Create a map of table relationships for better layout
  const tableRelations = new Map<string, Set<string>>();
  tables.forEach((table) => {
    tableRelations.set(table.name, new Set());
    table.foreignKeys.forEach((fk) => {
      tableRelations.get(table.name)?.add(fk.referencedTable);
    });
  });

  // Sort tables: tables with most relationships first, then alphabetically
  const sortedTables = [...tables].sort((a, b) => {
    const aRels =
      (tableRelations.get(a.name)?.size || 0) +
      tables.filter((t) => t.foreignKeys.some((fk) => fk.referencedTable === a.name))
        .length;
    const bRels =
      (tableRelations.get(b.name)?.size || 0) +
      tables.filter((t) => t.foreignKeys.some((fk) => fk.referencedTable === b.name))
        .length;
    if (bRels !== aRels) return bRels - aRels;
    return a.name.localeCompare(b.name);
  });

  // Calculate grid layout
  const columns = Math.ceil(Math.sqrt(sortedTables.length));
  const nodeWidth = 280;
  const nodeHeight = 400;
  const horizontalGap = 120;
  const verticalGap = 80;

  sortedTables.forEach((table, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    nodes.push({
      id: table.name,
      type: "tableNode",
      position: {
        x: col * (nodeWidth + horizontalGap),
        y: row * (nodeHeight + verticalGap),
      },
      data: {
        label: table.name,
        schema: table.schema,
        columns: table.columns,
        foreignKeys: table.foreignKeys,
      },
    });
  });

  // Create edges for foreign keys
  tables.forEach((table) => {
    table.foreignKeys.forEach((fk, fkIndex) => {
      // Check if the referenced table exists in our schema
      const targetTable = tables.find((t) => t.name === fk.referencedTable);
      if (!targetTable) return;

      edges.push({
        id: `${table.name}-${fk.column}-${fk.referencedTable}-${fkIndex}`,
        source: table.name,
        target: fk.referencedTable,
        sourceHandle: `${fk.column}-source`,
        targetHandle: `${fk.referencedColumn}-target`,
        type: "smoothstep",
        animated: true,
        style: {
          stroke: "hsl(var(--chart-2))",
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "hsl(var(--chart-2))",
        },
        label: fk.column,
        labelStyle: {
          fontSize: 10,
          fontWeight: 500,
          fill: "hsl(var(--muted-foreground))",
        },
        labelBgStyle: {
          fill: "hsl(var(--background))",
          fillOpacity: 0.9,
        },
      });
    });
  });

  return { nodes, edges };
}

export default function SchemaDiagram({ tables }: SchemaDiagramProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => calculateLayout(tables),
    [tables]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = calculateLayout(tables);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [tables, setNodes, setEdges]);

  const handleAutoLayout = useCallback(() => {
    const { nodes: newNodes, edges: newEdges } = calculateLayout(tables);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [tables, setNodes, setEdges]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-background"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(var(--border))"
        />
        <Controls className="!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted" />
        <Panel position="top-right" className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoLayout}
            className="gap-2"
          >
            <LayoutGrid className="w-4 h-4" />
            Reset Layout
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
