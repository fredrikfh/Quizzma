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
import type { SummaryPublic } from './SummaryPublic';
import {
    SummaryPublicFromJSON,
    SummaryPublicFromJSONTyped,
    SummaryPublicToJSON,
    SummaryPublicToJSONTyped,
} from './SummaryPublic';
import type { AnswerPublic } from './AnswerPublic';
import {
    AnswerPublicFromJSON,
    AnswerPublicFromJSONTyped,
    AnswerPublicToJSON,
    AnswerPublicToJSONTyped,
} from './AnswerPublic';

/**
 * 
 * @export
 * @interface QuestionPublicExtended
 */
export interface QuestionPublicExtended {
    /**
     * 
     * @type {string}
     * @memberof QuestionPublicExtended
     */
    quizId: string;
    /**
     * 
     * @type {string}
     * @memberof QuestionPublicExtended
     */
    text: string;
    /**
     * 
     * @type {string}
     * @memberof QuestionPublicExtended
     */
    id: string;
    /**
     * 
     * @type {boolean}
     * @memberof QuestionPublicExtended
     */
    predefined: boolean;
    /**
     * 
     * @type {Array<AnswerPublic>}
     * @memberof QuestionPublicExtended
     */
    answers?: Array<AnswerPublic>;
    /**
     * 
     * @type {Array<SummaryPublic>}
     * @memberof QuestionPublicExtended
     */
    summaries?: Array<SummaryPublic>;
}

/**
 * Check if a given object implements the QuestionPublicExtended interface.
 */
export function instanceOfQuestionPublicExtended(value: object): value is QuestionPublicExtended {
    if (!('quizId' in value) || value['quizId'] === undefined) return false;
    if (!('text' in value) || value['text'] === undefined) return false;
    if (!('id' in value) || value['id'] === undefined) return false;
    if (!('predefined' in value) || value['predefined'] === undefined) return false;
    return true;
}

export function QuestionPublicExtendedFromJSON(json: any): QuestionPublicExtended {
    return QuestionPublicExtendedFromJSONTyped(json, false);
}

export function QuestionPublicExtendedFromJSONTyped(json: any, ignoreDiscriminator: boolean): QuestionPublicExtended {
    if (json == null) {
        return json;
    }
    return {
        
        'quizId': json['quiz_id'],
        'text': json['text'],
        'id': json['id'],
        'predefined': json['predefined'],
        'answers': json['answers'] == null ? undefined : ((json['answers'] as Array<any>).map(AnswerPublicFromJSON)),
        'summaries': json['summaries'] == null ? undefined : ((json['summaries'] as Array<any>).map(SummaryPublicFromJSON)),
    };
}

export function QuestionPublicExtendedToJSON(json: any): QuestionPublicExtended {
    return QuestionPublicExtendedToJSONTyped(json, false);
}

export function QuestionPublicExtendedToJSONTyped(value?: QuestionPublicExtended | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'quiz_id': value['quizId'],
        'text': value['text'],
        'id': value['id'],
        'predefined': value['predefined'],
        'answers': value['answers'] == null ? undefined : ((value['answers'] as Array<any>).map(AnswerPublicToJSON)),
        'summaries': value['summaries'] == null ? undefined : ((value['summaries'] as Array<any>).map(SummaryPublicToJSON)),
    };
}

