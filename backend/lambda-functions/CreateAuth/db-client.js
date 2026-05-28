'use strict';

// Drop-in replacement for data-api-client using @aws-sdk/client-rds-data (SDK v3).
// Provides the same query(sql, params) API and result shape { records, numberOfRecordsUpdated }.

const { RDSDataClient, ExecuteStatementCommand } = require('@aws-sdk/client-rds-data');

const client = new RDSDataClient({});

function toRDSParams(params) {
    if (!params) return [];
    return Object.entries(params).map(([name, value]) => {
        if (value === null || value === undefined) return { name, value: { isNull: true } };
        if (typeof value === 'boolean') return { name, value: { booleanValue: value } };
        if (typeof value === 'number') {
            return Number.isInteger(value)
                ? { name, value: { longValue: value } }
                : { name, value: { doubleValue: value } };
        }
        return { name, value: { stringValue: String(value) } };
    });
}

function toRecords(columnMetadata, rows) {
    if (!rows || !columnMetadata) return [];
    return rows.map(row =>
        Object.fromEntries(columnMetadata.map((col, i) => {
            const field = row[i];
            let val = null;
            if (field.stringValue !== undefined) val = field.stringValue;
            else if (field.longValue !== undefined) val = field.longValue;
            else if (field.doubleValue !== undefined) val = field.doubleValue;
            else if (field.booleanValue !== undefined) val = field.booleanValue;
            else if (field.blobValue !== undefined) val = field.blobValue;
            return [col.name, val];
        }))
    );
}

module.exports = function createClient({ secretArn, resourceArn, database }) {
    return {
        async query(sql, params) {
            const command = new ExecuteStatementCommand({
                secretArn,
                resourceArn,
                database,
                sql,
                parameters: toRDSParams(params),
                includeResultMetadata: true,
            });
            const response = await client.send(command);
            return {
                records: toRecords(response.columnMetadata, response.records),
                numberOfRecordsUpdated: response.numberOfRecordsUpdated || 0,
            };
        },
    };
};
