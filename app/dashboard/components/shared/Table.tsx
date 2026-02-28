'use client';

import React from 'react';

interface TableColumn {
  header: string;
  key: string;
  render?: (value: any, row: any) => React.ReactNode;
  width?: string;
}

interface TableProps {
  columns: TableColumn[];
  data: any[];
  emptyMessage?: string;
}

export default function Table({ columns, data, emptyMessage = 'No data available' }: TableProps) {
  if (data.length === 0) {
    return (
      <div className="empty-state glass">
        <p>{emptyMessage}</p>
        <style jsx>{`
          .empty-state {
            padding: 3rem;
            text-align: center;
            color: var(--muted-foreground);
            border-radius: var(--radius);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="table-wrapper glass">
      <table className="custom-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.key}
                data-width={column.width}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .table-wrapper {
          overflow: hidden;
          border-radius: var(--radius);
          width: 100%;
        }

        .custom-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        th {
          text-align: left;
          padding: 1rem 1.5rem;
          font-weight: 600;
          color: var(--muted-foreground);
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid var(--border);
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        td {
          padding: 1rem 1.5rem;
          color: var(--foreground);
          border-bottom: 1px solid var(--border);
          transition: background 0.2s ease;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }
      `}</style>
    </div>
  );
}
