/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Information about a geologic data table.
 */
export type TableInfo = {
    /**
     * Table name
     */
    name: string;
    /**
     * Human-readable table name
     */
    display_name: string;
    /**
     * Total number of features
     */
    feature_count: number;
    /**
     * Geometry type (POINT, LINESTRING, POLYGON, etc.)
     */
    geometry_type?: (string | null);
    /**
     * Table description
     */
    description?: (string | null);
};

