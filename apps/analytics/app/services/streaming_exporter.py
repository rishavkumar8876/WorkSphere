import csv
import io
import json
from typing import AsyncGenerator, Iterable, Dict, Any

class StreamingExporter:
    """
    Assessment 05: Memory-safe chunked streaming exporter.
    Processes arbitrarily large task/activity records without buffering them in RAM.
    """

    @staticmethod
    def stream_csv(records: Iterable[Dict[str, Any]], fieldnames: list[str]) -> Iterable[str]:
        """
        Yields CSV formatted chunks line by line using an in-memory string buffer.
        """
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
        
        # Write header
        writer.writeheader()
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        for record in records:
            writer.writerow(record)
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    @staticmethod
    def stream_json_lines(records: Iterable[Dict[str, Any]]) -> Iterable[str]:
        """
        Yields JSON Lines (NDJSON) formatted records line by line.
        """
        for record in records:
            yield json.dumps(record, default=str) + "\n"

    @staticmethod
    def stream_json_array(records: Iterable[Dict[str, Any]]) -> Iterable[str]:
        """
        Yields standard JSON Array streaming chunks:
        '[\n', '{"id": 1},\n', '{"id": 2}\n', ']'
        """
        yield "[\n"
        first = True
        for record in records:
            if not first:
                yield ",\n"
            else:
                first = False
            yield json.dumps(record, default=str)
        yield "\n]"
