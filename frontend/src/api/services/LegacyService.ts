/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class LegacyService {
    /**
     * Get Atlas Maps
     * Legacy endpoint for atlas_maps data (for backward compatibility).
     *
     * Consider using /api/v1/geologic/atlas_maps instead.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getAtlasMapsAtlasMapsGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/atlas_maps',
        });
    }
}
