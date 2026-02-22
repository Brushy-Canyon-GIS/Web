/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Detailed response for a single photo.
 */
export type PhotoDetailResponse = {
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
     * Full URL to photo if available
     */
    full_url?: (string | null);
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
    /**
     * All properties
     */
    properties?: Record<string, any>;
};

