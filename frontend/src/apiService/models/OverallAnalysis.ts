/* tslint:disable */
/* eslint-disable */
/**
 * FastAPI
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
import type { AnswerPublicExtended } from './AnswerPublicExtended';
import {
    AnswerPublicExtendedFromJSON,
    AnswerPublicExtendedFromJSONTyped,
    AnswerPublicExtendedToJSON,
    AnswerPublicExtendedToJSONTyped,
} from './AnswerPublicExtended';
import type { SummaryPublic } from './SummaryPublic';
import {
    SummaryPublicFromJSON,
    SummaryPublicFromJSONTyped,
    SummaryPublicToJSON,
    SummaryPublicToJSONTyped,
} from './SummaryPublic';

/**
 * 
 * @export
 * @interface OverallAnalysis
 */
export interface OverallAnalysis {
    /**
     * 
     * @type {SummaryPublic}
     * @memberof OverallAnalysis
     */
    summary: SummaryPublic | null;
    /**
     * 
     * @type {Array<AnswerPublicExtended>}
     * @memberof OverallAnalysis
     */
    answers: Array<AnswerPublicExtended>;
}

/**
 * Check if a given object implements the OverallAnalysis interface.
 */
export function instanceOfOverallAnalysis(value: object): value is OverallAnalysis {
    if (!('summary' in value) || value['summary'] === undefined) return false;
    if (!('answers' in value) || value['answers'] === undefined) return false;
    return true;
}

export function OverallAnalysisFromJSON(json: any): OverallAnalysis {
    return OverallAnalysisFromJSONTyped(json, false);
}

export function OverallAnalysisFromJSONTyped(json: any, ignoreDiscriminator: boolean): OverallAnalysis {
    if (json == null) {
        return json;
    }
    return {
        
        'summary': SummaryPublicFromJSON(json['summary']),
        'answers': ((json['answers'] as Array<any>).map(AnswerPublicExtendedFromJSON)),
    };
}

export function OverallAnalysisToJSON(json: any): OverallAnalysis {
    return OverallAnalysisToJSONTyped(json, false);
}

export function OverallAnalysisToJSONTyped(value?: OverallAnalysis | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'summary': SummaryPublicToJSON(value['summary']),
        'answers': ((value['answers'] as Array<any>).map(AnswerPublicExtendedToJSON)),
    };
}

