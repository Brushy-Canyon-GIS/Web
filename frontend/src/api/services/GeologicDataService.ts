/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TableInfo } from '../models/TableInfo';
import type { TableListResponse } from '../models/TableListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class GeologicDataService {
    /**
     * List all available geologic data tables
     * Returns a list of all available geologic data tables with metadata.
     * @returns TableListResponse Successful Response
     * @throws ApiError
     */
    public static listTablesApiV1GeologicTablesGet(): CancelablePromise<TableListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/geologic/tables',
        });
    }
    /**
     * Get information about a specific table
     * Returns detailed information about a specific geologic data table.
     * @param tableName
     * @returns TableInfo Successful Response
     * @throws ApiError
     */
    public static getTableInfoApiV1GeologicTablesTableNameGet(
        tableName: string,
    ): CancelablePromise<TableInfo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/geologic/tables/{table_name}',
            path: {
                'table_name': tableName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get all features from a table
     * Returns all features from the specified table as GeoJSON. Supports pagination.
     * @param tableName
     * @param limit Maximum number of features to return (None = no limit)
     * @param offset Number of features to skip
     * @returns any GeoJSON FeatureCollection
     * @throws ApiError
     */
    public static getFeaturesApiV1GeologicTableNameGet(
        tableName: string,
        limit?: (number | null),
        offset?: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/geologic/{table_name}',
            path: {
                'table_name': tableName,
            },
            query: {
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Filter features with query parameters
     * Returns filtered features from the specified table as GeoJSON. Supports filtering by properties and spatial bounding box.
     * @param tableName
     * @param limit Maximum number of features to return
     * @param offset Number of features to skip
     * @param bbox Bounding box: min_lng,min_lat,max_lng,max_lat (e.g., -104.5,31.5,-103.5,32.5)
     * @param name Filter by name (case-insensitive partial match)
     * @param mapSymbol Filter by map symbol
     * @param featureType Filter by feature type
     * @param region Filter by region
     * @param fanId Filter by fan ID
     * @returns any GeoJSON FeatureCollection
     * @throws ApiError
     */
    public static filterFeaturesApiV1GeologicTableNameFilterGet(
        tableName: string,
        limit: number = 100,
        offset?: number,
        bbox?: (string | null),
        name?: (string | null),
        mapSymbol?: (string | null),
        featureType?: (string | null),
        region?: (string | null),
        fanId?: (number | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/geologic/{table_name}/filter',
            path: {
                'table_name': tableName,
            },
            query: {
                'limit': limit,
                'offset': offset,
                'bbox': bbox,
                'name': name,
                'map_symbol': mapSymbol,
                'feature_type': featureType,
                'region': region,
                'fan_id': fanId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Query features within a bounding box
     * Returns features that intersect with the specified bounding box.
     * @param tableName
     * @param minLng Minimum longitude (west)
     * @param minLat Minimum latitude (south)
     * @param maxLng Maximum longitude (east)
     * @param maxLat Maximum latitude (north)
     * @param limit Maximum number of features to return
     * @param offset Number of features to skip
     * @returns any GeoJSON FeatureCollection
     * @throws ApiError
     */
    public static getFeaturesInBboxApiV1GeologicTableNameBboxGet(
        tableName: string,
        minLng: number,
        minLat: number,
        maxLng: number,
        maxLat: number,
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/geologic/{table_name}/bbox',
            path: {
                'table_name': tableName,
            },
            query: {
                'min_lng': minLng,
                'min_lat': minLat,
                'max_lng': maxLng,
                'max_lat': maxLat,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
