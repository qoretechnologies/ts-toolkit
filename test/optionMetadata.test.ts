import { IQoreOptionCreateAction, IQorusFormFieldMetadata, TQoreOptions } from '../src';

/**
 * An option names the action that creates one of its values in its `metadata`
 * (qorus#683). The server serves an option's `metadata` unchanged, so the same
 * descriptor reaches the form as the field's `metadata`.
 */
describe('option metadata', () => {
  it('lets an option name the action that creates its values', () => {
    const options = {
      channel: {
        type: 'string',
        allowed_values_creatable: true,
        metadata: {
          create_action: {
            action: 'create_channel',
            value_field: 'channel.id',
            display_name_field: 'channel.name',
          },
        },
      },
    } satisfies TQoreOptions;

    expect(options.channel.metadata.create_action.value_field).toBe('channel.id');
  });

  it('requires the response field the created value is read from', () => {
    // @ts-expect-error: without `value_field` the form cannot know which field is the new value
    const createAction: IQoreOptionCreateAction = { action: 'create_channel' };

    expect(createAction.action).toBe('create_channel');
  });

  it('reads the descriptor from a form field and keeps other metadata open', () => {
    const metadata: IQorusFormFieldMetadata = {
      create_action: { action: 'create_channel', value_field: 'channel.id' },
      interactions: [],
    };

    expect(metadata.create_action?.action).toBe('create_channel');
    expect(metadata.interactions).toEqual([]);
  });
});
