/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Information about a single photo panel.
 */
export type PhotoInfo = {
    /**
     * Photo ID
     */
    id: number;
    /**
     * Photo panel name
     */
    name: string;
    /**
     * Photo filename or URL
     */
    hyperlink?: (string | null);
    /**
     * Map symbol code
     */
    map_symbol?: (string | null);
    /**
     * Stratigraphic interval
     */
    strat_interval?: (string | null);
    /**
     * Feature type
     */
    feature_type?: (string | null);
    /**
     * Photo panel length
     */
    length?: (number | null);
    /**
     * GeoJSON geometry
     */
    geometry?: (Record<string, any> | null);
};

