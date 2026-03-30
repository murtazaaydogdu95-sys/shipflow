{{/*
Expand the name of the chart.
*/}}
{{- define "codepylot.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "codepylot.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "codepylot.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "codepylot.labels" -}}
helm.sh/chart: {{ include "codepylot.chart" . }}
{{ include "codepylot.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels.
*/}}
{{- define "codepylot.selectorLabels" -}}
app.kubernetes.io/name: {{ include "codepylot.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
PostgreSQL selector labels.
*/}}
{{- define "codepylot.postgresql.selectorLabels" -}}
app.kubernetes.io/name: {{ include "codepylot.name" . }}-postgresql
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Ollama selector labels.
*/}}
{{- define "codepylot.ollama.selectorLabels" -}}
app.kubernetes.io/name: {{ include "codepylot.name" . }}-ollama
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the DATABASE_URL.
*/}}
{{- define "codepylot.databaseUrl" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "postgresql://%s:%s@%s-postgresql:5432/%s" .Values.postgresql.auth.username .Values.postgresql.auth.password (include "codepylot.fullname" .) .Values.postgresql.auth.database }}
{{- else }}
{{- .Values.externalDatabase.url }}
{{- end }}
{{- end }}

{{/*
Create the OLLAMA_URL.
*/}}
{{- define "codepylot.ollamaUrl" -}}
{{- if .Values.ollama.enabled }}
{{- printf "http://%s-ollama:11434/v1" (include "codepylot.fullname" .) }}
{{- else }}
{{- "" }}
{{- end }}
{{- end }}
