/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class S3Service {
    /**
     * Get Geojson
     * @param layer
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getGeojsonApiV1GeojsonLayerGet(
        layer: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/geojson/{layer}',
            path: {
                'layer': layer,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
